# NG😊NE — Deployment to Production

Complete step-by-step guide to deploy the NG😊NE platform to the internet.

**Result:** A live website at **https://ngone.in** anyone can open and use.

| Service   | Provider  | URL |
|-----------|-----------|-----|
| Frontend  | Vercel    | https://ngone.in (or ngone.vercel.app) |
| Backend   | Railway   | https://ngone-api.up.railway.app |
| Database  | Railway   | PostgreSQL (auto-provisioned) |
| Cache     | Railway   | Redis (auto-provisioned) |

---

## Prerequisites

- [x] GitHub account (repo: https://github.com/nikhil-codes-tech/Resource-allocation-.git)
- [ ] Railway account (https://railway.app — sign in with GitHub)
- [ ] Vercel account (https://vercel.com — sign in with GitHub)
- [ ] Domain: ngone.in (DNS access required)

---

## Step 1 — Push Code to GitHub

Your code needs to be on GitHub for Railway and Vercel to deploy it.

```bash
# Navigate to project root
cd "c:\Users\kajal\OneDrive\RESOURCE ALLOCATION"

# Initialize git if not already done
git init

# Add the remote
git remote add origin https://github.com/nikhil-codes-tech/Resource-allocation-.git

# Create .gitignore if needed (already exists)
# Make sure node_modules is ignored

# Stage all files
git add .

# Commit
git commit -m "feat: connect frontend to backend + deployment configs"

# Push (use main or master — whichever your repo uses)
git push -u origin main
```

> **Important:** Make sure `node_modules/` and `.env` are in `.gitignore`!

---

## Step 2 — Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if not already connected
5. Select the **Resource-allocation-** repository
6. Railway will detect Node.js automatically

### 2.2 Set Root Directory

Since the backend is in a subfolder:
1. Click on the service that was created
2. Go to **Settings** tab
3. Under **Root Directory**, set: `ngone-backend`
4. Under **Build Command**, verify: `npm run build`
5. Under **Start Command**, verify: `npx prisma migrate deploy && npm start`

### 2.3 Add PostgreSQL Database

1. Click **"+ New"** in the project dashboard
2. Select **"Database"** → **"PostgreSQL"**
3. Railway automatically sets `DATABASE_URL` ✅

### 2.4 Add Redis

1. Click **"+ New"** → **"Database"** → **"Redis"**
2. Railway automatically sets `REDIS_URL` ✅

### 2.5 Add Environment Variables

Click your API service → **"Variables"** tab → add these:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://ngone.in
API_PREFIX=/api

# JWT Secrets (generate unique ones!)
# Run in terminal: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
ACCESS_TOKEN_SECRET=<paste-generated-secret-1>
REFRESH_TOKEN_SECRET=<paste-generated-secret-2>
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
RESET_TOKEN_EXPIRES=1h

# Google OAuth
GOOGLE_CLIENT_ID=1015443459371-9cn52fgbl4m6rap0vb5mesftsu3lho64.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://<your-railway-url>/api/auth/google/callback

# Feature Flags (start with these off, enable later)
ENABLE_SMS=false
ENABLE_EMAIL=false
ENABLE_PAYMENTS=false
ENABLE_SOCKET=true

# Email settings
EMAIL_FROM=hello@ngone.in
EMAIL_FROM_NAME=NGone Platform
AWS_REGION=ap-south-1
```

### 2.6 Generate Public URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. You'll get a URL like: `ngone-backend-production.up.railway.app`
4. **Copy this URL** — you need it for the frontend

### 2.7 Test the Backend

Open in browser:
```
https://<your-railway-url>/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "db": "connected",
    "redis": "connected"
  }
}
```

### 2.8 Seed the Database (Optional)

In Railway dashboard → service → click **"Shell"** button:
```bash
npm run db:seed
```

This populates demo data (users, NGOs, crises, programmes, etc.)

---

## Step 3 — Deploy Frontend to Vercel

### 3.1 Create Vercel Project

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import the **Resource-allocation-** GitHub repo
4. Set **Framework Preset**: `Vite`
5. Set **Root Directory**: `.` (root — frontend is at the root)
6. Set **Build Command**: `npm run build`
7. Set **Output Directory**: `dist`

### 3.2 Add Environment Variables

In Vercel project → **Settings** → **Environment Variables**, add:

```env
VITE_API_URL=https://<your-railway-url>/api
VITE_SOCKET_URL=https://<your-railway-url>
VITE_RAZORPAY_KEY_ID=
VITE_GOOGLE_CLIENT_ID=1015443459371-9cn52fgbl4m6rap0vb5mesftsu3lho64.apps.googleusercontent.com
VITE_APP_NAME=NGOne Platform
```

> **Replace `<your-railway-url>`** with the actual Railway domain from Step 2.6

### 3.3 Deploy

Click **"Deploy"** — wait 1-2 minutes.

Your site is now live at:
```
https://resource-allocation.vercel.app
```

---

## Step 4 — Add Custom Domain (ngone.in)

### 4.1 Add Domain in Vercel

1. Go to Vercel project → **Settings** → **Domains**
2. Add: `ngone.in`
3. Add: `www.ngone.in`

### 4.2 Configure DNS at Your Registrar

Add these DNS records at your domain registrar (GoDaddy, Namecheap, etc.):

| Type  | Name | Value               |
|-------|------|---------------------|
| A     | @    | 76.76.21.21         |
| CNAME | www  | cname.vercel-dns.com |

### 4.3 Wait for Propagation

- DNS changes take 5 minutes to 48 hours
- Vercel auto-provisions SSL certificate ✅
- Once propagated: **https://ngone.in** is live! 🎉

---

## Step 5 — Update Backend CORS

After you have the final frontend URL, update Railway env var:
```
CLIENT_URL=https://ngone.in
```

And update the Google OAuth callback in Google Cloud Console:
1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client
3. Add **Authorized redirect URIs**: `https://<your-railway-url>/api/auth/google/callback`
4. Add **Authorized JavaScript origins**: `https://ngone.in`

---

## Step 6 — Verify Everything

### Test Checklist

- [ ] **Homepage loads** at https://ngone.in
- [ ] **Login works** (email/password with demo credentials)
- [ ] **Dashboard loads** with data (demo data if DB is empty)
- [ ] **Donate page** works (demo mode without Razorpay keys)
- [ ] **DARPAN page** loads and links to ngodarpan.gov.in
- [ ] **API health** returns 200 at `<railway-url>/api/health`
- [ ] **Mobile responsive** — check on phone browser

### Common Issues

| Problem | Fix |
|---------|-----|
| CORS errors | Check `CLIENT_URL` env var on Railway matches your frontend URL exactly |
| 502 on Railway | Check Railway logs; usually DATABASE_URL or REDIS_URL not set |
| Blank page on Vercel | Check `vercel.json` rewrites; ensure `dist/` has `index.html` |
| Login fails | Check JWT secrets are set; try demo mode (works without backend) |
| Socket errors | Normal if backend is cold-starting; auto-reconnects |

---

## Optional: External Services (Add Later)

These are NOT required for the app to work. Add them when ready:

| Service | Purpose | Setup Guide |
|---------|---------|-------------|
| Razorpay | Real payments | dashboard.razorpay.com → API Keys |
| Cloudinary | Image uploads | cloudinary.com → Dashboard → Credentials |
| AWS SES | Email sending | console.aws.amazon.com/ses |
| MSG91 | Indian SMS/OTP | msg91.com → API section |
| Twilio | SMS fallback | console.twilio.com |

For each, get the API keys and add them to Railway environment variables.

---

## Architecture Diagram

```
                    ┌─────────────┐
   Users ──────────▶│   Vercel    │ (ngone.in)
                    │  React SPA  │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │  Railway    │ (ngone-api.up.railway.app)
                    │  Express    │
                    │  Socket.io  │
                    └──┬─────┬───┘
                       │     │
              ┌────────▼┐  ┌▼────────┐
              │PostgreSQL│  │  Redis  │
              │ (Railway)│  │(Railway)│
              └──────────┘  └─────────┘
```
