# HopOn Deployment Guide

This guide explains how to deploy HopOn to public hosting so users can access it via a simple URL.

## Quick Summary

- **Frontend**: Deploy to **Vercel** (free, automatic GitHub integration, ideal for Next.js)
- **Backend**: Deploy to **Render** (free tier, Postgres included, easy env var setup)
- **Database**: Render PostgreSQL (included in free tier)
- **Result**: Users get a URL like `https://hopon.vercel.app` and everything works

## Prerequisites

1. GitHub repository with HopOn code pushed to `main` branch
2. Vercel account (sign up at https://vercel.com — free tier OK)
3. Render account (sign up at https://render.com — free tier OK)
4. Google OAuth credentials (optional; required for real Google login; can use dev fallback for testing)

## Step 1: Deploy Backend to Render

### 1a. Create a Render Web Service

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Select **Deploy an existing repository** → Connect your GitHub account and select the HopOn repo
4. Fill in the ok, first i want to push all this project to a private repository i have created which is: https://github.com/danielvgc/hopon_pruebas.git. how should i do it or if you can do it is betterform:
   - **Name**: `hopon-backend` (or your choice)
   - **Environment**: `Docker`
   - **Region**: Choose closest to you or users (e.g., US, EU)
   - **Branch**: `main`
   - **Dockerfile path**: `backend/Dockerfile`
   - **Start command**: (leave blank — Dockerfile has CMD)
   - **Instance Type**: Free tier is fine for MVP testing

### 1b. Add Environment Variables

Before deploying, add these env vars in the **Environment** section of Render:

| Key | Value | Notes |
|-----|-------|-------|
| `ENV` | `production` | Signals prod mode |
| `SECRET_KEY` | (generate a random 32+ char string) | `openssl rand -hex 32` |
| `JWT_SECRET` | (generate a random 32+ char string) | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | (your Google OAuth client ID) | [See step 4](#step-4-optional-google-oauth) |
| `GOOGLE_CLIENT_SECRET` | (your Google OAuth secret) | [See step 4](#step-4-optional-google-oauth) |
| `GOOGLE_REDIRECT_URI` | `https://<backend-url>/auth/google/callback` | Replace with actual Render URL (e.g., https://hopon-backend.onrender.com/auth/google/callback) |
| `FRONTEND_ORIGINS` | `https://<frontend-url>` | Replace with Vercel URL (e.g., https://hopon.vercel.app) |
| `SESSION_COOKIE_SECURE` | `true` | Enforce HTTPS-only cookies |
| `SESSION_COOKIE_SAMESITE` | `Lax` | CSRF protection |
| `DATABASE_URL` | (auto-created by Render Postgres) | See step 1c |
| `DEV_GOOGLE_LOGIN` | `false` | Disable dev fallback in production |

### 1c. Add PostgreSQL

In the same Render dashboard, create a PostgreSQL database:

1. Click **New +** → **PostgreSQL**
2. Choose a name (e.g., `hopon-db`)
3. Region: Same as web service (recommended)
4. PostgreSQL Version: 15 (default OK)
5. Create database
6. Copy the internal connection string (e.g., `postgresql://user:pass@dpg-xxx.onrender.com:5432/hopon`)
7. Add it to your backend service's `DATABASE_URL` env var

### 1d. Deploy

Click **Deploy** and wait ~2–3 minutes. The backend should be live at `https://hopon-backend.onrender.com` (Render assigns a URL).

### 1e. Get the Backend URL

Once deployed:
1. Go to your Web Service dashboard in Render
2. Copy the URL shown at the top (e.g., `https://hopon-backend.onrender.com`)
3. You'll need this for the frontend env var

---

## Step 2: Deploy Frontend to Vercel

### 2a. Connect to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New...** → **Project**
3. Select **Import Git Repository** → GitHub → Select your HopOn repo
4. Vercel auto-detects Next.js; click **Deploy**

### 2b. Add Environment Variables

After linking, before final deploy:

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add this key-value pair:
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://hopon-backend.onrender.com` (or your actual Render backend URL)
4. Click **Save**

### 2c. Redeploy

1. Go to **Deployments**
2. Click the 3-dot menu on the latest deployment
3. Select **Redeploy**

Vercel will redeploy with the new env var, and your frontend will now point to the live backend.

### 2d. Get the Frontend URL

Once deployed, Vercel shows your live URL in the dashboard (e.g., `https://hopon.vercel.app`).

---

## Step 3: Test the Live Site

1. Open the frontend URL in your browser: `https://hopon.vercel.app`
2. Click **Sign In**
3. Try signing in with email/password (if you created accounts during dev)
4. Or click **Try as Demo User** to test without credentials
5. Or (if Google OAuth configured) click **Sign In with Google**

If you see errors, check:
- Backend and frontend URLs match in env vars
- `FRONTEND_ORIGINS` in backend includes the Vercel URL
- Database connection is working (check Render logs)

---

## Step 4 (Optional): Google OAuth

To enable real Google sign-in (instead of dev fallback):

### 4a. Register a Google OAuth App

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Search for **OAuth 2.0** or **Google+ API** and enable it
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (for local dev)
   - `https://hopon-backend.onrender.com/auth/google/callback` (replace with your Render URL)
7. Create and copy the **Client ID** and **Client Secret**

### 4b. Add to Render

In your backend's Render environment variables, add these (Google OAuth credentials provided separately):
- `GOOGLE_CLIENT_ID`: [Your OAuth Client ID]
- `GOOGLE_CLIENT_SECRET`: [Your OAuth Client Secret]
- `GOOGLE_REDIRECT_URI`: `https://hopon-backend.onrender.com/auth/google/callback`
- `DEV_GOOGLE_LOGIN`: `false`

**Important**: Enter Google OAuth credentials directly in Render dashboard. Never commit them to Git.

### 4c. Retest

Redeploy backend and test Google sign-in from the frontend.

---

## Step 5: Automatic Deployment on Push

Both Vercel and Render watch your GitHub `main` branch:
- Any push to `main` triggers a redeploy automatically
- No manual steps needed after initial setup

---

## Troubleshooting

### "Cannot reach backend" / CORS errors
- Verify `FRONTEND_ORIGINS` in backend includes your Vercel URL
- Check backend is actually running (Render dashboard → Logs)

### "Sign in with Google" returns 500
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Check redirect URIs match in Google Cloud Console
- Look at backend logs for the actual error

### Database connection fails
- Verify `DATABASE_URL` is set in backend env vars
- Check Render PostgreSQL is running (Render dashboard → Resources)
- Try querying the DB from the command line with the connection string

### Vercel shows old frontend code
- Redeploy explicitly (don't wait for auto-deploy)
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)

---

## Next: Share the URL

Once deployed, share the frontend URL with users:
- **Example**: `https://hopon.vercel.app`
- No installation needed — users just click and use
- Works on any browser, any device

---

## Local Development (Reference)

If you want to run locally with docker-compose:
```bash
docker compose -f docker-compose.prod.yml up --build
```
Then access at `http://localhost:3000` (frontend) and `http://localhost:8000` (backend).

