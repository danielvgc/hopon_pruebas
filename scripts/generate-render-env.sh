#!/bin/bash
# Generate Render environment variables for HopOn backend deployment
# Usage: ./scripts/generate-render-env.sh

echo "==============================================="
echo "HopOn Backend - Render Environment Setup"
echo "==============================================="
echo ""

# Generate secrets if not provided
SECRET_KEY=${1:-$(openssl rand -hex 32)}
JWT_SECRET=${2:-$(openssl rand -hex 32)}

echo "Environment Variables to add to Render Dashboard:"
echo "=================================================="
echo ""
echo "Copy and paste each key-value pair into Render:"
echo ""
echo "1. ENV = production"
echo "2. SECRET_KEY = $SECRET_KEY"
echo "3. JWT_SECRET = $JWT_SECRET"
echo "4. GOOGLE_CLIENT_ID = [provided separately - keep secure]"
echo "5. GOOGLE_CLIENT_SECRET = [provided separately - keep secure]"
echo "6. GOOGLE_REDIRECT_URI = https://hopon-backend.onrender.com/auth/google/callback"
echo "7. DEV_GOOGLE_LOGIN = false"
echo "8. SESSION_COOKIE_SECURE = true"
echo "9. SESSION_COOKIE_SAMESITE = Lax"
echo "10. FRONTEND_ORIGINS = https://hopon.vercel.app"
echo ""
echo "Note: DATABASE_URL will be auto-created when you add PostgreSQL to Render"
echo "Note: Google OAuth credentials should be entered directly in Render dashboard"
echo ""
echo "Step-by-step:"
echo "1. Go to https://dashboard.render.com"
echo "2. Select your 'hopon-backend' Web Service"
echo "3. Go to Settings → Environment"
echo "4. Click 'Add Environment Variable' for each of the above"
echo "5. After adding all, click 'Deploy' to redeploy with new variables"
echo ""
echo "==============================================="
