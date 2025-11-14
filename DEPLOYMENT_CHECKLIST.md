# HopOn Deployment Checklist

Quick reference for deploying HopOn to production with Vercel + Render.

## Prerequisites Checklist
- [ ] GitHub repository pushed (`https://github.com/danielvgc/hopon_pruebas`)
- [ ] Vercel account created (https://vercel.com)
- [ ] Render account created (https://render.com)
- [ ] Google OAuth credentials ready (already configured)

## Deployment Steps

### 1. Deploy Backend to Render

#### 1.1 Create Web Service
- [ ] Go to https://dashboard.render.com
- [ ] Click **New +** → **Web Service**
- [ ] Connect GitHub, select `hopon_pruebas` repo
- [ ] Fill in settings:
  - **Name**: `hopon-backend`
  - **Environment**: `Docker`
  - **Region**: (choose closest to users)
  - **Branch**: `main`
  - **Dockerfile path**: `backend/Dockerfile`
- [ ] Click **Create Web Service**

#### 1.2 Add PostgreSQL Database
- [ ] In Render dashboard, click **New +** → **PostgreSQL**
- [ ] Settings:
  - **Name**: `hopon-db`
  - **Region**: (same as web service)
  - **PostgreSQL Version**: `15`
- [ ] Create database
- [ ] Copy the **Internal Database URL**

#### 1.3 Add Environment Variables to Backend
Go to your `hopon-backend` Web Service → **Settings** → **Environment**.

Add these variables:
```
ENV = production
SECRET_KEY = (generate: openssl rand -hex 32)
JWT_SECRET = (generate: openssl rand -hex 32)
GOOGLE_CLIENT_ID = [Your OAuth Client ID - provided separately]
GOOGLE_CLIENT_SECRET = [Your OAuth Client Secret - provided separately]
GOOGLE_REDIRECT_URI = https://hopon-backend.onrender.com/auth/google/callback
DEV_GOOGLE_LOGIN = false
SESSION_COOKIE_SECURE = true
SESSION_COOKIE_SAMESITE = Lax
FRONTEND_ORIGINS = https://hopon.vercel.app
DATABASE_URL = (paste the Internal Database URL from step 1.2)
```

**Important**: Google OAuth credentials were provided separately. Enter them only in Render's dashboard, never in code.

#### 1.4 Deploy Backend
- [ ] Click **Deploy** on the web service
- [ ] Wait 2-3 minutes for deployment to complete
- [ ] Note the backend URL: `https://hopon-backend.onrender.com` (or your Render-assigned URL)

### 2. Deploy Frontend to Vercel

#### 2.1 Create Vercel Project
- [ ] Go to https://vercel.com/dashboard
- [ ] Click **Add New...** → **Project**
- [ ] Select **Import Git Repository**
- [ ] Choose `hopon_pruebas` from your GitHub
- [ ] Vercel auto-detects Next.js
- [ ] **STOP** before clicking Deploy

#### 2.2 Add Environment Variable
- [ ] Click **Settings** (appears before Deploy)
- [ ] Go to **Environment Variables**
- [ ] Add:
  - **Key**: `NEXT_PUBLIC_API_BASE_URL`
  - **Value**: `https://hopon-backend.onrender.com`
- [ ] Click **Add**
- [ ] Now click **Deploy**

#### 2.3 Wait for Deployment
- [ ] Vercel deploys automatically
- [ ] Note the frontend URL: `https://hopon.vercel.app` (or your Vercel-assigned URL)
- [ ] **Go back to Render and update `FRONTEND_ORIGINS`** with the exact Vercel URL

### 3. Final Verification

#### 3.1 Update Backend with Frontend URL
- [ ] Go back to Render dashboard
- [ ] Select `hopon-backend` Web Service
- [ ] Go to **Settings** → **Environment**
- [ ] Update `FRONTEND_ORIGINS` to your Vercel URL (e.g., `https://hopon.vercel.app`)
- [ ] Click **Deploy** to redeploy with the updated value

#### 3.2 Test the Live Site
- [ ] Open your Vercel frontend URL in browser
- [ ] Click **Sign In** or **Create Account**
- [ ] Try:
  - [ ] Email/password signup and login
  - [ ] Demo user login
  - [ ] Google sign-in
  - [ ] Browse events, create event, join event
- [ ] Check Render logs for any errors

#### 3.3 Share with Users
- [ ] Copy your Vercel frontend URL
- [ ] Share with testers: `https://hopon.vercel.app`
- [ ] Users can immediately test without installation

## Troubleshooting

### Backend won't start
- Check Render logs: Dashboard → Web Service → Logs
- Verify DATABASE_URL is set and Postgres is running
- Ensure all required env vars are present

### Frontend shows "Cannot reach backend"
- Verify `FRONTEND_ORIGINS` in backend includes the Vercel URL
- Verify `NEXT_PUBLIC_API_BASE_URL` in frontend matches backend URL
- Check CORS errors in browser console

### Google login fails with 500
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check `GOOGLE_REDIRECT_URI` matches Render URL
- Look at backend logs for the actual error

### Database connection error
- Verify `DATABASE_URL` is set in Render env vars
- Check PostgreSQL service is running (Render dashboard)
- Try restarting the Postgres instance

## Automatic Deployments

After initial setup:
- **Any push to `main` branch** automatically triggers:
  - Backend rebuild and deploy (Render watches Docker)
  - Frontend rebuild and deploy (Vercel watches GitHub)
- No additional manual steps needed for updates

## Next Steps

After successful deployment:
1. **Add custom domain** (optional): Render/Vercel settings
2. **Set up monitoring**: Add Sentry or similar
3. **Enable email verification**: Configure SMTP
4. **Add analytics**: Google Analytics, Mixpanel, etc.

---

## Generated Credentials (Save Securely!)

Google OAuth credentials were provided separately via secure channel.

**⚠️ Important**: 
- Never commit secrets to Git (GitHub's push protection will block them)
- Store credentials securely in your password manager or secret vault
- Only enter them directly in Render's dashboard during setup (not in code)
- If compromised, regenerate new credentials in Google Cloud Console

