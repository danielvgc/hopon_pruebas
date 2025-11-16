#!/usr/bin/env python3
import os
import json
import hashlib
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Optional

import jwt
from authlib.integrations.flask_client import OAuth
from flask import (
    Flask,
    jsonify,
    request,
    g,
    redirect,
    url_for,
    make_response,
    session,
)
from flask_cors import CORS
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from models import db, Event, EventParticipant, User, Follow

def create_app() -> Flask:
    app = Flask(__name__)

    # Configuration
    # Support DATABASE_URL for production (Postgres). Fall back to local sqlite for dev.
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        # Fail fast in production if DATABASE_URL is missing
        if os.environ.get('ENV', 'development') == 'production':
            raise RuntimeError("DATABASE_URL environment variable is required in production. Set it to your PostgreSQL connection string.")
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hopon.db'
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    # Allow explicit ENV setting (development/production)
    app.config['ENV'] = os.environ.get('ENV', 'development')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    # In production, enforce that GOOGLE_REDIRECT_URI is explicitly set
    default_redirect_uri = 'http://localhost:8000/auth/google/callback' if os.environ.get('ENV', 'development') == 'development' else None
    google_redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', default_redirect_uri)
    if not google_redirect_uri:
        raise RuntimeError("GOOGLE_REDIRECT_URI environment variable is required in production. Set it to https://your-render-url.onrender.com/auth/google/callback")
    app.config['GOOGLE_REDIRECT_URI'] = google_redirect_uri
    # Enable a development-only Google login flow when real Google OAuth
    # credentials are not available. This lets developers test the popup
    # auth flow locally without registering an OAuth app.
    app.config['DEV_GOOGLE_LOGIN'] = os.environ.get('DEV_GOOGLE_LOGIN', 'false').lower() == 'true'
    app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'dev-jwt-secret')
    app.config['JWT_ACCESS_EXPIRES'] = int(os.environ.get('JWT_ACCESS_EXPIRES', '900'))  # 15 minutes
    app.config['JWT_REFRESH_EXPIRES'] = int(os.environ.get('JWT_REFRESH_EXPIRES', '604800'))  # 7 days
    app.config['SESSION_COOKIE_SAMESITE'] = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'

    # Initialize extensions
    db.init_app(app)
    # Support a comma-separated list of allowed frontend origins (e.g. for localhost, 127.0.0.1, staging)
    frontend_origins_env = os.environ.get('FRONTEND_ORIGINS')
    if frontend_origins_env:
        frontend_origins = [o.strip() for o in frontend_origins_env.split(',') if o.strip()]
    else:
        frontend_origins = [os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000')]

    # Add production domain explicitly
    frontend_origins.append('https://hopon-pruebas.vercel.app')
    
    # Log the configured origins for debugging
    print(f"[HOPON] CORS configured for origins: {frontend_origins}", flush=True)

    # Custom CORS handler to allow *.vercel.app domains with credentials
    def cors_middleware(response):
        origin = request.headers.get('Origin')
        if origin:
            # Check if origin matches allowed list or is a vercel.app subdomain
            if origin in frontend_origins or origin.endswith('.vercel.app'):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    app.after_request(cors_middleware)
    
    # Also use CORS() for basic preflight handling
    CORS(app, supports_credentials=True, methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'], resources={r"/*": {"origins": frontend_origins}})

    oauth = OAuth()
    oauth.init_app(app)
    if app.config['GOOGLE_CLIENT_ID'] and app.config['GOOGLE_CLIENT_SECRET']:
        oauth.register(
            name='google',
            client_id=app.config['GOOGLE_CLIENT_ID'],
            client_secret=app.config['GOOGLE_CLIENT_SECRET'],
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={
                'scope': 'openid email profile',
                'prompt': 'select_account',
                'access_type': 'offline',
            },
        )
    
    # Create tables
    def generate_token(user_id: int, token_type: str, expires_in: Optional[int] = None) -> str:
        if expires_in is None:
            expires_in = (
                app.config['JWT_REFRESH_EXPIRES']
                if token_type == 'refresh'
                else app.config['JWT_ACCESS_EXPIRES']
            )
        now = datetime.utcnow()
        payload = {
            'sub': user_id,
            'type': token_type,
            'iat': now,
            'exp': now + timedelta(seconds=expires_in),
        }
        return jwt.encode(payload, app.config['JWT_SECRET'], algorithm='HS256')

    def decode_token(token: str, expected_type: Optional[str] = None) -> Optional[dict]:
        try:
            payload = jwt.decode(token, app.config['JWT_SECRET'], algorithms=['HS256'])
        except jwt.PyJWTError:
            return None
        if expected_type and payload.get('type') != expected_type:
            return None
        return payload

    def ensure_unique_username(base: str) -> str:
        candidate = base
        suffix = 1
        while User.query.filter_by(username=candidate).first():
            candidate = f"{base}{suffix}"
            suffix += 1
        return candidate

    def ensure_host_participant(event: Event) -> None:
        """Ensure the event host is registered as a participant."""
        if not event.host_user_id:
            return
        host = User.query.get(event.host_user_id)
        if not host:
            return
        existing = EventParticipant.query.filter_by(
            event_id=event.id,
            user_id=event.host_user_id,
        ).first()
        if existing:
            return
        db.session.add(
            EventParticipant(
                event_id=event.id,
                user_id=event.host_user_id,
                player_name=host.username,
                team="host",
            )
        )

    def get_google_client():
        # Return the registered google client or None if not configured.
        # Callers should handle the None case and decide whether to use a
        # development fallback.
        return oauth.create_client('google')

    def seed_initial_data() -> None:
        """Populate the database with baseline data for local development."""
        seed_users = [
            dict(
                username="Alex Chen",
                email="alex@example.com",
                bio="Basketball enthusiast, love pickup games and meeting new people!",
                gender="male",
                rating=4.8,
                location="Downtown",
                sports="Basketball,Tennis",
            ),
            dict(
                username="Sarah Miller",
                email="sarah@example.com",
                bio="Tennis coach by day, competitive player by night.",
                gender="female",
                rating=4.9,
                location="Riverside",
                sports="Tennis,Badminton",
            ),
            dict(
                username="Emily Carter",
                email="emily@example.com",
                bio="Early morning runner seeking new trails and partners for weekend 5Ks.",
                gender="female",
                rating=4.4,
                location="Harborfront",
                sports="Running,Yoga",
            ),
        ]

        created_user = False
        for payload in seed_users:
            if not User.query.filter_by(username=payload["username"]).first():
                db.session.add(User(**payload))
                created_user = True
        if created_user:
            db.session.commit()

        host = User.query.filter_by(username="Alex Chen").first()
        if host:
            now = datetime.utcnow()
            seed_events = [
                dict(
                    name="Downtown Pickup Game",
                    sport="Basketball",
                    location="Central Park Courts",
                    notes="Intermediate run with friendly competition.",
                    max_players=10,
                    event_date=now + timedelta(hours=2),
                    latitude=43.6532,
                    longitude=-79.3832,
                    skill_level="Intermediate",
                ),
                dict(
                    name="Sunrise Run Crew",
                    sport="Running",
                    location="Harborfront Boardwalk",
                    notes="Casual 5K with coffee afterwards.",
                    max_players=25,
                    event_date=now + timedelta(hours=6),
                    latitude=43.6408,
                    longitude=-79.3818,
                    skill_level="All Levels",
                ),
                dict(
                    name="Twilight Tennis Doubles",
                    sport="Tennis",
                    location="Riverside Tennis Club",
                    notes="Advanced doubles ladder. Bring your own racket.",
                    max_players=4,
                    event_date=now + timedelta(days=1),
                    latitude=43.7001,
                    longitude=-79.3568,
                    skill_level="Advanced",
                ),
            ]

            created_event = False
            for payload in seed_events:
                if not Event.query.filter_by(name=payload["name"]).first():
                    db.session.add(Event(host_user_id=host.id, **payload))
                    created_event = True
            if created_event:
                db.session.commit()
                host_events = Event.query.filter_by(host_user_id=host.id).all()
                created_participant = False
                for event in host_events:
                    existing_count = EventParticipant.query.filter_by(
                        event_id=event.id,
                        user_id=event.host_user_id,
                    ).count()
                    if existing_count == 0:
                        ensure_host_participant(event)
                        created_participant = True
                if created_participant:
                    db.session.commit()

    with app.app_context():
        db.create_all()
        seed_initial_data()

    @app.before_request
    def attach_current_user():
        g.current_user = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1].strip()
            payload = decode_token(token, expected_type='access')
            if payload:
                user = User.query.get(payload.get('sub'))
                if user:
                    g.current_user = user

    @app.get("/health")
    def health():
        return jsonify(status="ok"), 200

    @app.get("/hello")
    def hello():
        name = request.args.get("name", "world")
        return jsonify(message=f"Hello, {name}!") , 200

    @app.get("/auth/google/login")
    def google_login():
        client = get_google_client()
        # If Google OAuth is not configured, and dev mode is enabled, redirect
        # to a development-only callback that simulates a Google sign-in.
        if client is None:
            if app.config.get('DEV_GOOGLE_LOGIN'):
                # preserve next/origin in session and redirect to the dev flow
                next_url = request.args.get('next')
                next_origin = None
                if isinstance(next_url, str):
                    try:
                        from urllib.parse import urlparse

                        parsed = urlparse(next_url)
                        candidate_origin = f"{parsed.scheme}://{parsed.netloc}"
                        if candidate_origin in frontend_origins:
                            next_origin = candidate_origin
                    except Exception:
                        next_origin = None

                session['oauth_next'] = next_origin or frontend_origins[0]
                # Allow optional `email` and `name` query params to customize the dev user.
                dev_redirect = url_for('google_dev', _external=True)
                return redirect(dev_redirect)
            return jsonify({'error': 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET or enable DEV_GOOGLE_LOGIN for local testing.'}), 500
        # The frontend should pass its origin as the `next` param (e.g. window.location.origin)
        next_url = request.args.get('next')
        next_origin = frontend_origins[0]  # Default to first allowed origin
        if isinstance(next_url, str):
            try:
                from urllib.parse import urlparse

                parsed = urlparse(next_url)
                candidate_origin = f"{parsed.scheme}://{parsed.netloc}"
                if candidate_origin in frontend_origins:
                    next_origin = candidate_origin
            except Exception:
                pass

        # Store the next URL in the session for the callback to retrieve
        session['oauth_next'] = next_origin
        # Use the configured GOOGLE_REDIRECT_URI from environment (not auto-generated URL)
        # to ensure it matches what's registered in Google Cloud Console
        redirect_uri = app.config['GOOGLE_REDIRECT_URI']
        return client.authorize_redirect(redirect_uri)

    @app.get("/auth/google/callback")
    def google_callback():
        try:
            client = get_google_client()
            if client is None:
                return jsonify({'error': 'Google OAuth is not configured on this server.'}), 400
            token = client.authorize_access_token()
        except Exception as exc:  # noqa: W0703 - surface error to client
            return jsonify({'error': f'Failed to authorize with Google: {exc}'}), 400

        userinfo = token.get('userinfo')
        if not userinfo:
            try:
                userinfo = client.parse_id_token(token)
            except Exception as exc:  # noqa: W0703
                return jsonify({'error': f'Failed to fetch Google user info: {exc}'}), 400

        google_sub = userinfo.get('sub')
        email = userinfo.get('email')
        if not google_sub or not email:
            return jsonify({'error': 'Google profile is missing required information (sub, email).'}), 400

        user = User.query.filter(or_(User.google_sub == google_sub, User.email == email)).first()
        display_name = userinfo.get('name') or email.split('@')[0]
        given_name = userinfo.get('given_name') or display_name
        username_seed = "".join(ch if ch.isalnum() else "_" for ch in given_name.lower()).strip("_") or "player"
        
        is_new_user = not user
        needs_username_setup = False

        if not user:
            # Create user with temporary username that will be updated
            username = ensure_unique_username(username_seed)
            user = User(
                username=username,
                email=email,
                bio=userinfo.get('profile'),
                gender=None,
                rating=None,
                location=None,
                sports=None,
                google_sub=google_sub,
                avatar_url=userinfo.get('picture'),
            )
            db.session.add(user)
            needs_username_setup = True
        else:
            user.google_sub = user.google_sub or google_sub
            if userinfo.get('picture'):
                user.avatar_url = userinfo.get('picture')

        db.session.commit()

        access_token = generate_token(user.id, 'access')
        refresh_token = generate_token(user.id, 'refresh')

        payload = {
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'needs_username_setup': needs_username_setup,
        }
        redirect_target = session.pop('oauth_next', frontend_origins[0])
        # Ensure redirect_target is one of the allowed frontend origins
        if redirect_target not in frontend_origins:
            redirect_target = frontend_origins[0]

        # Properly escape JSON for embedding in HTML using JSON string
        import html
        payload_json = json.dumps(payload)
        
        script = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Signing in…</title>
  </head>
  <body>
    <script>
      (function() {{
        const payload = {payload_json};
        console.log('Received payload:', payload);
        if (window.opener && window.opener !== window) {{
            console.log('Posting message to opener');
            window.opener.postMessage({{ type: "hopon:auth", payload: payload }}, "*");
            setTimeout(() => {{ window.close(); }}, 100);
        }} else {{
            console.log('No opener, redirecting to: {redirect_target}');
            window.localStorage.setItem("hoponAuthPayload", JSON.stringify(payload));
            window.location.replace("{redirect_target}");
        }}
      }})();
    </script>
    <p>Signing you in…</p>
  </body>
</html>"""

        response = make_response(script)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=app.config['JWT_REFRESH_EXPIRES'],
            httponly=True,
            secure=app.config['SESSION_COOKIE_SECURE'],
            samesite=app.config['SESSION_COOKIE_SAMESITE'],
        )
        return response

    @app.get('/auth/google/dev')
    def google_dev():
        """Development-only: simulate a Google OAuth callback.

        This endpoint creates or finds a user using the provided `email` and
        optional `name` query params (or generates defaults), issues JWT
        tokens, sets the refresh cookie, and returns the same HTML payload
        that the real Google callback returns so the frontend popup flow
        can be exercised locally without real Google credentials.
        """
        # Only allow in non-production when enabled explicitly
        if app.config.get('ENV') == 'production' or not app.config.get('DEV_GOOGLE_LOGIN'):
            return jsonify({'error': 'Dev Google login is not allowed in production.'}), 403

        # Determine the frontend origin to post back to
        next_url = request.args.get('next') or session.get('oauth_next')
        next_origin = None
        if isinstance(next_url, str):
            try:
                from urllib.parse import urlparse

                parsed = urlparse(next_url)
                candidate_origin = f"{parsed.scheme}://{parsed.netloc}"
                if candidate_origin in frontend_origins:
                    next_origin = candidate_origin
            except Exception:
                next_origin = None
        redirect_target = next_origin or frontend_origins[0]

        # Allow developer to pass email/name for deterministic testing
        email = request.args.get('email') or f"dev+{int(datetime.utcnow().timestamp())}@example.com"
        name = request.args.get('name') or email.split('@')[0]

        # Reuse user creation logic similar to google_callback
        google_sub = f"dev:{email}"
        user = User.query.filter(or_(User.google_sub == google_sub, User.email == email)).first()
        display_name = name
        given_name = name
        username_seed = "".join(ch if ch.isalnum() else "_" for ch in given_name.lower()).strip("_") or "player"
        
        is_new_user = not user
        needs_username_setup = False

        if not user:
            username = ensure_unique_username(username_seed)
            user = User(
                username=username,
                email=email,
                bio='Development user (Google dev login)',
                gender=None,
                rating=None,
                location=None,
                sports=None,
                google_sub=google_sub,
                avatar_url=None,
            )
            db.session.add(user)
            needs_username_setup = True
        else:
            user.google_sub = user.google_sub or google_sub

        db.session.commit()

        access_token = generate_token(user.id, 'access')
        refresh_token = generate_token(user.id, 'refresh')

        payload = {
            'message': 'Dev login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'needs_username_setup': needs_username_setup,
        }

        script = f"""<!DOCTYPE html>
<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>Signing in…</title>\n  </head>\n  <body>\n    <script>\n      (function() {{\n        const payload = {json.dumps(payload)};\n                if (window.opener && window.opener !== window) {{\n                    window.opener.postMessage({{ type: \"hopon:auth\", payload }}, \"{redirect_target}\");\n                    window.close();\n                }} else {{\n                    window.localStorage.setItem(\"hoponAuthPayload\", JSON.stringify(payload));\n                    window.location.replace(\"{redirect_target}\");\n                }}\n      }})();\n    </script>\n    <p>Signing you in…</p>\n  </body>\n</html>"""

        response = make_response(script)
        response.headers['Content-Type'] = 'text/html'
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=app.config['JWT_REFRESH_EXPIRES'],
            httponly=True,
            secure=app.config['SESSION_COOKIE_SECURE'],
            samesite=app.config['SESSION_COOKIE_SAMESITE'],
        )
        return response

    @app.post("/auth/refresh")
    def refresh_access_token():
        refresh_token = request.cookies.get('refresh_token')
        if not refresh_token:
            return jsonify({'error': 'Missing refresh token'}), 401
        payload = decode_token(refresh_token, expected_type='refresh')
        if not payload:
            response = make_response(jsonify({'error': 'Invalid refresh token'}), 401)
            response.delete_cookie('refresh_token')
            return response
        user = User.query.get(payload.get('sub'))
        if not user:
            response = make_response(jsonify({'error': 'Unknown user'}), 401)
            response.delete_cookie('refresh_token')
            return response
        access_token = generate_token(user.id, 'access')
        return jsonify({'access_token': access_token, 'user': user.to_dict()})

    @app.post("/auth/demo-login")
    def demo_login():
        """Development-only: create/find a user and return tokens for local testing.
        This endpoint should NOT be enabled in production unless intentionally.
        """
        if app.config.get('ENV') == 'production':
            return jsonify({'error': 'Demo login not allowed in production'}), 403

        data = request.get_json(silent=True) or {}
        username = (data.get('username') or 'dev_user').strip()
        email = data.get('email') or f"{username}@example.com"

        # Prefer find by email, otherwise create a new user
        user = User.query.filter_by(email=email).first()

        if not user:
            username_final = ensure_unique_username(username)
            user = User(
                username=username_final,
                email=email,
                bio='Development user',
                gender=None,
                rating=None,
                location=None,
                sports=None,
                google_sub=None,
                avatar_url=None,
            )
            db.session.add(user)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                user = User.query.filter_by(email=email).first()

        access_token = generate_token(user.id, 'access')
        refresh_token = generate_token(user.id, 'refresh')

        response = jsonify({'access_token': access_token, 'user': user.to_dict()})
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=app.config['JWT_REFRESH_EXPIRES'],
            httponly=True,
            secure=app.config['SESSION_COOKIE_SECURE'],
            samesite=app.config['SESSION_COOKIE_SAMESITE'],
        )
        return response

    @app.post("/auth/signup")
    def signup():
        """Create a new user account with email and password."""
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        username = (data.get('username') or '').strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        # Validate email format
        if '@' not in email or '.' not in email.split('@')[1]:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already in use'}), 409
        
        # Check if username already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 409
        
        try:
            user = User(
                username=username,
                email=email,
                bio=None,
                gender=None,
                rating=None,
                location=None,
                sports=None,
                google_sub=None,
                avatar_url=None,
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            
            # Issue tokens
            access_token = generate_token(user.id, 'access')
            refresh_token = generate_token(user.id, 'refresh')
            
            response = jsonify({
                'message': 'Signup successful',
                'user': user.to_dict(),
                'access_token': access_token,
                'needs_username_setup': True,  # Email signup requires full profile setup
            })
            response.set_cookie(
                'refresh_token',
                refresh_token,
                max_age=app.config['JWT_REFRESH_EXPIRES'],
                httponly=True,
                secure=app.config['SESSION_COOKIE_SECURE'],
                samesite=app.config['SESSION_COOKIE_SAMESITE'],
            )
            return response, 201
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to create account'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to create account'}), 500

    @app.post("/auth/login")
    def login():
        """Authenticate user with email and password."""
        data = request.get_json(silent=True) or {}
        
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        access_token = generate_token(user.id, 'access')
        refresh_token = generate_token(user.id, 'refresh')
        
        response = jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
        })
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=app.config['JWT_REFRESH_EXPIRES'],
            httponly=True,
            secure=app.config['SESSION_COOKIE_SECURE'],
            samesite=app.config['SESSION_COOKIE_SAMESITE'],
        )
        return response, 200

    @app.post("/auth/logout")
    def logout():
        response = make_response(jsonify({'message': 'Logged out'}))
        response.delete_cookie('refresh_token')
        return response

    @app.delete("/auth/delete-account")
    def delete_account():
        """Delete the authenticated user's account and all associated data."""
        if not g.current_user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        user_id = g.current_user.id
        user_email = g.current_user.email
        
        try:
            # Delete all events hosted by this user
            Event.query.filter_by(host_user_id=user_id).delete()
            
            # Delete all event participations (cascade handles this, but explicit for clarity)
            EventParticipant.query.filter_by(user_id=user_id).delete()
            
            # Delete all follow relationships (both as follower and followee)
            Follow.query.filter_by(follower_id=user_id).delete()
            Follow.query.filter_by(followee_id=user_id).delete()
            
            # Delete the user
            db.session.delete(g.current_user)
            db.session.commit()
            
            print(f"[HOPON] User account deleted: {user_email} (ID: {user_id})", flush=True)
            
            # Clear cookies and return success response
            response = make_response(jsonify({'message': 'Account deleted successfully'}), 200)
            response.delete_cookie('refresh_token')
            response.delete_cookie('user_id')
            return response
            
        except Exception as e:
            db.session.rollback()
            print(f"[HOPON] Error deleting account for {user_email}: {str(e)}", flush=True)
            return jsonify({'error': 'Failed to delete account'}), 500

    @app.get("/auth/session")
    def session_info():
        if g.current_user:
            return jsonify({'authenticated': True, 'user': g.current_user.to_dict()}), 200
        refresh_token = request.cookies.get('refresh_token')
        if refresh_token:
            payload = decode_token(refresh_token, expected_type='refresh')
            if payload:
                user = User.query.get(payload.get('sub'))
                if user:
                    access_token = generate_token(user.id, 'access')
                    return (
                        jsonify(
                            {
                                'authenticated': True,
                                'user': user.to_dict(),
                                'access_token': access_token,
                            }
                        ),
                        200,
                    )
        return jsonify({'authenticated': False}), 200

    @app.get("/auth/username-available")
    def check_username_available():
        """Check if a username is available (not taken)."""
        username = (request.args.get('username') or '').strip()
        
        if not username:
            return jsonify({'error': 'Username parameter is required'}), 400
        
        if len(username) < 3:
            return jsonify({'available': False, 'message': 'Username must be at least 3 characters'}), 200
        
        if len(username) > 50:
            return jsonify({'available': False, 'message': 'Username must be at most 50 characters'}), 200
        
        # Check if username already exists (case-insensitive)
        existing = User.query.filter(User.username.ilike(username)).first()
        
        print(f"[HOPON] Checking username availability: '{username}' - Found: {existing is not None}", flush=True)
        
        if existing:
            return jsonify({'available': False, 'message': 'Username already taken'}), 200
        
        return jsonify({'available': True, 'message': 'Username is available'}), 200

    @app.patch("/auth/profile")
    def update_profile():
        """Update user profile information. Requires authentication."""
        if not g.current_user:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json(silent=True) or {}
        user = g.current_user
        
        # Update bio if provided
        if 'bio' in data:
            user.bio = data.get('bio') or None
        
        # Update location if provided
        if 'location' in data:
            user.location = data.get('location') or None
        
        # Update latitude/longitude if provided
        if 'latitude' in data:
            user.latitude = data.get('latitude')
        if 'longitude' in data:
            user.longitude = data.get('longitude')
        
        # Update sports if provided
        if 'sports' in data:
            sports_data = data.get('sports')
            if sports_data:
                # Handle both array and string formats
                if isinstance(sports_data, list):
                    user.sports = ', '.join(sports_data)
                else:
                    user.sports = sports_data
            else:
                user.sports = None
        
        # Update username if provided (with uniqueness check)
        if 'username' in data:
            new_username = (data.get('username') or '').strip()
            
            if not new_username:
                return jsonify({'error': 'Username cannot be empty'}), 400
            
            if len(new_username) < 3:
                return jsonify({'error': 'Username must be at least 3 characters'}), 400
            
            if len(new_username) > 50:
                return jsonify({'error': 'Username must be at most 50 characters'}), 400
            
            # Check if new username is different from current
            if new_username != user.username:
                # Check if username already exists
                existing = User.query.filter_by(username=new_username).first()
                if existing:
                    return jsonify({'error': 'Username already taken'}), 409
                
                user.username = new_username
        
        try:
            db.session.commit()
            return jsonify({
                'message': 'Profile updated successfully',
                'user': user.to_dict()
            }), 200
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to update profile'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to update profile'}), 500

    @app.post("/auth/setup-account")
    def setup_account():
        """Complete account setup after initial signup. Requires authentication."""
        if not g.current_user:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json(silent=True) or {}
        user = g.current_user
        
        # Validate required fields
        username = (data.get('username') or '').strip()
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if len(username) > 50:
            return jsonify({'error': 'Username must be at most 50 characters'}), 400
        
        # Check if username is available (or is same as current)
        if username != user.username:
            existing = User.query.filter_by(username=username).first()
            if existing:
                return jsonify({'error': 'Username already taken'}), 409
        
        user.username = username
        
        # Update bio (optional)
        if 'bio' in data:
            user.bio = data.get('bio') or None
        
        # Update location (optional)
        if 'location' in data:
            user.location = data.get('location') or None
        
        # Update latitude/longitude (optional)
        if 'latitude' in data:
            user.latitude = data.get('latitude')
        if 'longitude' in data:
            user.longitude = data.get('longitude')
        
        # Update sports (optional)
        if 'sports' in data:
            sports_data = data.get('sports')
            if sports_data:
                if isinstance(sports_data, list):
                    user.sports = ', '.join(sports_data)
                else:
                    user.sports = sports_data
            else:
                user.sports = None
        
        try:
            db.session.commit()
            print(f"[HOPON] Account setup completed for user: {user.username} (ID: {user.id})", flush=True)
            return jsonify({
                'message': 'Account setup completed successfully',
                'user': user.to_dict()
            }), 200
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to setup account'}), 409
        except Exception as e:
            db.session.rollback()
            print(f"[HOPON] Error setting up account: {str(e)}", flush=True)
            return jsonify({'error': 'Failed to setup account'}), 500

    # Event Management
    # Utility
    def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Compute haversine distance in km between two coordinates."""
        from math import radians, sin, cos, asin, sqrt
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        R = 6371.0
        return R * c

    @app.post("/events")
    def create_event():
        """Create a new event"""
        data = request.get_json() or {}

        if not all(k in data for k in ['name', 'sport', 'location', 'max_players']):
            return jsonify({'error': 'Missing required fields: name, sport, location, max_players'}), 400
        
        try:
            host_user_id = g.current_user.id if g.current_user else data.get('host_user_id')
            event = Event(
                name=data['name'],
                sport=data['sport'],
                location=data['location'],
                notes=data.get('notes'),
                max_players=data['max_players'],
                event_date=datetime.fromisoformat(data['event_date']) if data.get('event_date') else None,
                latitude=data.get('latitude'),
                longitude=data.get('longitude'),
                skill_level=data.get('skill_level'),
                host_user_id=host_user_id,
            )
            
            db.session.add(event)
            db.session.flush()
            if host_user_id:
                ensure_host_participant(event)
            db.session.commit()
            
            return jsonify({
                'message': 'Event created successfully',
                'event': event.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to create event'}), 500

    @app.get("/events")
    def get_events():
        """Get all available events/games"""
        events = Event.query.order_by(Event.created_at.desc()).all()
        return jsonify([event.to_dict() for event in events]), 200

    @app.get("/events/nearby")
    def nearby_events():
        """Return events with optional haversine distance sorting."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        events = Event.query.all()
        out = []
        for e in events:
            d = None
            if lat is not None and lng is not None and e.latitude is not None and e.longitude is not None:
                d = haversine_km(lat, lng, e.latitude, e.longitude)
            item = e.to_dict()
            item['distance_km'] = d
            out.append(item)
        # Sort by distance if present
        out.sort(key=lambda x: x['distance_km'] if x['distance_km'] is not None else 1e9)
        return jsonify(out), 200

    @app.get("/events/<int:event_id>")
    def get_event(event_id):
        """Get a specific event by ID"""
        event = Event.query.get_or_404(event_id)
        return jsonify(event.to_dict()), 200

    @app.post("/events/<int:event_id>/join")
    def join_event(event_id):
        """Join a specific event/game"""
        data = request.get_json() or {}
        event = Event.query.get_or_404(event_id)

        user = g.current_user
        team = data.get('team', 'team_a')
        guest_token = data.get('guest_token')
        hashed_guest_token: Optional[str] = None

        if user:
            player_name = data.get('player_name') or user.username
            existing = EventParticipant.query.filter_by(event_id=event_id, user_id=user.id).first()
            if existing:
                return jsonify({'message': 'Already joined', 'event': event.to_dict()}), 200
            user_id = user.id
            guest_name = None
        else:
            player_name = data.get('player_name')
            if not player_name:
                return jsonify({'error': 'Player name is required'}), 400
            guest_name = player_name
            if guest_token:
                hashed_guest_token = hashlib.sha256(guest_token.encode()).hexdigest()
                existing = EventParticipant.query.filter_by(
                    event_id=event_id,
                    guest_token=hashed_guest_token,
                ).first()
                if existing:
                    return jsonify({'message': 'Already joined', 'event': event.to_dict()}), 200
            else:
                guest_token = uuid4().hex
                hashed_guest_token = hashlib.sha256(guest_token.encode()).hexdigest()
            user_id = None

        if event.participants.count() >= event.max_players:
            return jsonify({'error': 'Event is full'}), 409
        
        try:
            participant = EventParticipant(
                event_id=event_id,
                user_id=user_id,
                player_name=player_name,
                team=team,
                guest_name=guest_name,
                guest_token=hashed_guest_token,
            )
            
            db.session.add(participant)
            db.session.commit()

            response_payload = {
                'message': 'Successfully joined event',
                'event': event.to_dict()
            }
            if not user and guest_token:
                response_payload['guest_token'] = guest_token
            return jsonify(response_payload), 200
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Failed to join event'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to join event'}), 500

    @app.post("/events/<int:event_id>/leave")
    def leave_event(event_id: int):
        data = request.get_json() or {}
        user = g.current_user
        if user:
            participant = EventParticipant.query.filter_by(event_id=event_id, user_id=user.id).first()
        else:
            guest_token = data.get('guest_token')
            if not guest_token:
                return jsonify({'error': 'guest_token is required for guest users'}), 400
            hashed_guest_token = hashlib.sha256(guest_token.encode()).hexdigest()
            participant = EventParticipant.query.filter_by(
                event_id=event_id,
                guest_token=hashed_guest_token,
            ).first()
        if not participant:
            return jsonify({'message': 'Not a participant'}), 200
        db.session.delete(participant)
        db.session.commit()
        return jsonify({'message': 'Left event'}), 200

    @app.get("/events/<int:event_id>/participants")
    def get_event_participants(event_id):
        """Get all participants for a specific event"""
        event = Event.query.get_or_404(event_id)
        participants = EventParticipant.query.filter_by(event_id=event_id).all()
        
        return jsonify({
            'event': event.to_dict(),
            'participants': [participant.to_dict() for participant in participants]
        }), 200

    # User Management
    @app.post("/users")
    def create_user():
        data = request.get_json()
        if not data or not all(k in data for k in ["username", "email"]):
            return jsonify({"error": "Missing required fields: username, email"}), 400
        try:
            user = User(
                username=data["username"],
                email=data["email"],
                bio=data.get("bio"),
                gender=data.get("gender")
            )
            db.session.add(user)
            db.session.commit()
            return jsonify({"message": "User created successfully", "user": user.to_dict()}), 201
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "Username or email already exists"}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to create user"}), 500

    @app.get("/users/<int:user_id>")
    def get_user(user_id):
        user = User.query.get_or_404(user_id)
        return jsonify(user.to_dict()), 200

    @app.get("/users/nearby")
    def users_nearby():
        """Simple nearby users endpoint. For now returns all users with discovery fields."""
        users = User.query.all()
        following_lookup = set()
        if g.current_user:
            following_lookup = {
                f.followee_id for f in Follow.query.filter_by(follower_id=g.current_user.id).all()
            }
        out = []
        for u in users:
            payload = u.to_dict()
            payload['events_count'] = EventParticipant.query.filter_by(user_id=u.id).count()
            # compatibility camelCase
            payload['eventsCount'] = payload['events_count']
            payload['is_following'] = u.id in following_lookup if g.current_user else False
            out.append(payload)
        return jsonify(out), 200

    @app.post("/users/<int:user_id>/follow")
    def follow_user(user_id: int):
        data = request.get_json() or {}
        follower_id = g.current_user.id if g.current_user else data.get('follower_id')
        if follower_id is None:
            return jsonify({'error': 'follower_id is required'}), 400
        if follower_id == user_id:
            return jsonify({'error': 'cannot follow self'}), 400
        exists = Follow.query.filter_by(follower_id=follower_id, followee_id=user_id).first()
        if exists:
            return jsonify({'message': 'Already following'}), 200
        db.session.add(Follow(follower_id=follower_id, followee_id=user_id))
        db.session.commit()
        return jsonify({'message': 'Followed'}), 200

    @app.delete("/users/<int:user_id>/follow")
    def unfollow_user(user_id: int):
        follower_id = g.current_user.id if g.current_user else request.args.get('follower_id', type=int)
        if follower_id is None:
            data = request.get_json(silent=True) or {}
            follower_id = data.get('follower_id')
        if follower_id is None:
            return jsonify({'error': 'follower_id is required'}), 400
        f = Follow.query.filter_by(follower_id=follower_id, followee_id=user_id).first()
        if not f:
            return jsonify({'message': 'Not following'}), 200
        db.session.delete(f)
        db.session.commit()
        return jsonify({'message': 'Unfollowed'}), 200

    @app.get("/me/events")
    def my_events():
        """Return joined and hosted events for a user."""
        user_id = g.current_user.id if g.current_user else request.args.get('user_id', type=int)
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        joined_ep = EventParticipant.query.filter_by(user_id=user_id).all()
        joined_ids = {ep.event_id for ep in joined_ep}
        joined = [Event.query.get(eid).to_dict() for eid in joined_ids if Event.query.get(eid)]
        hosted = Event.query.filter_by(host_user_id=user_id).all()
        return jsonify({
            'joined': joined,
            'hosted': [e.to_dict() for e in hosted],
        }), 200

    @app.post("/admin/delete-user-by-username/<username>")
    def admin_delete_user_by_username(username):
        """Admin endpoint to delete a user by username. Requires ADMIN_SECRET header."""
        admin_secret = os.environ.get('ADMIN_SECRET', 'dev-admin-secret')
        provided_secret = request.headers.get('X-Admin-Secret', '')
        
        if provided_secret != admin_secret:
            return jsonify({'error': 'Unauthorized'}), 401
        
        user = User.query.filter(db.func.lower(User.username) == username.lower()).first()
        if not user:
            return jsonify({'error': f'User "{username}" not found'}), 404
        
        user_id = user.id
        print(f"[ADMIN] Deleting user: {user.username} (ID: {user_id}), Sports: {user.sports}", flush=True)
        
        # Delete event participants (user joined events)
        ep_count = EventParticipant.query.filter_by(user_id=user_id).count()
        EventParticipant.query.filter_by(user_id=user_id).delete()
        
        # Delete events hosted by user
        ev_count = Event.query.filter_by(host_user_id=user_id).count()
        Event.query.filter_by(host_user_id=user_id).delete()
        
        # Delete follow relationships
        follow_count = Follow.query.filter((Follow.follower_id == user_id) | (Follow.followee_id == user_id)).count()
        Follow.query.filter((Follow.follower_id == user_id) | (Follow.followee_id == user_id)).delete()
        
        # Delete the user
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'message': f'User "{username}" deleted successfully',
            'user_id': user_id,
            'event_participants_deleted': ep_count,
            'events_deleted': ev_count,
            'follows_deleted': follow_count
        }), 200

    return app
    

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=True)
