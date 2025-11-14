# DEPLOYMENT QUICK REFERENCE

**Your exact deployment values are in `DEPLOYMENT_EXACT_VALUES.md` (local, NOT in Git)**

---

## What to Copy-Paste for Render Backend

### Step 1: Go to Render Backend Service Environment Variables

**Copy and paste these EXACTLY:**

```
ENV=production
SECRET_KEY=02bba7bd8878464da6a261e8a9cdd3e4968e4fafc28c0304d99bd34854f01b11
JWT_SECRET=bffae3481c5fcd793e4554601e77315802ed270ca75bf12b3d171b97397c95e6
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=Lax
DEV_GOOGLE_LOGIN=false
GOOGLE_REDIRECT_URI=https://hopon-backend.onrender.com/auth/google/callback
FRONTEND_ORIGINS=https://hopon.vercel.app
```

**These you'll need to fill in (from step 1c and step 4a):**

```
GOOGLE_CLIENT_ID=[Your Google OAuth Client ID]
GOOGLE_CLIENT_SECRET=[Your Google OAuth Client Secret]
DATABASE_URL=[Your Render PostgreSQL Internal Database URL]
```

---

## What to Copy-Paste for Vercel Frontend

**In Vercel Settings → Environment Variables, add:**

```
NEXT_PUBLIC_API_BASE_URL=https://hopon-backend.onrender.com
```

Then redeploy.

---

## Summary of Values

| Variable | Value | Where It Comes From |
|----------|-------|-------------------|
| `ENV` | `production` | Hardcoded for production |
| `SECRET_KEY` | `02bba7bd8878464da6a261e8a9cdd3e4968e4fafc28c0304d99bd34854f01b11` | Generated with `openssl rand -hex 32` |
| `JWT_SECRET` | `bffae3481c5fcd793e4554601e77315802ed270ca75bf12b3d171b97397c95e6` | Generated with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | `[YOUR VALUE]` | Google Cloud Console → OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | `[YOUR VALUE]` | Google Cloud Console → OAuth 2.0 credentials |
| `GOOGLE_REDIRECT_URI` | `https://hopon-backend.onrender.com/auth/google/callback` | Fixed (Render backend URL + callback path) |
| `FRONTEND_ORIGINS` | `https://hopon.vercel.app` | Your Vercel frontend URL |
| `SESSION_COOKIE_SECURE` | `true` | Hardcoded for security |
| `SESSION_COOKIE_SAMESITE` | `Lax` | Hardcoded for CSRF protection |
| `DATABASE_URL` | `postgresql://...` | Render PostgreSQL internal connection string |
| `DEV_GOOGLE_LOGIN` | `false` | Hardcoded (disable dev fallback in production) |
| `NEXT_PUBLIC_API_BASE_URL` | `https://hopon-backend.onrender.com` | Your Render backend URL (Vercel only) |

---

## DO NOT

❌ Commit `DEPLOYMENT_EXACT_VALUES.md` to Git  
❌ Share credentials in emails  
❌ Put credentials in code  
❌ Commit `.env` files  

---

For full deployment guide, see `DEPLOYMENT.md` in your repo.
