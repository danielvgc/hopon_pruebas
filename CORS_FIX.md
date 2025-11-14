# CORS Fix - November 14, 2025

## Issue
Frontend on Vercel was getting CORS errors when calling the backend API.

## Root Cause
The `FRONTEND_ORIGINS` environment variable in Render was only set to `https://hopon.vercel.app`, but the actual frontend URL is `https://hopon-pruebas-e89z4ljlr-danielvgcs-projects.vercel.app` (Vercel's preview domain).

## Solution
1. Backend CORS now properly configured to accept both URLs
2. Added logging to show configured origins
3. Frontend redeploy triggers cache refresh

## Status
✅ Backend updated
✅ CORS headers verified working
⏳ Awaiting frontend redeploy completion
