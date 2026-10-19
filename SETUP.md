# Wasel Platform — Developer Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | bundled with Node |
| Git | any | https://git-scm.com |
| Supabase account | — | https://supabase.com |

---

## 1. Supabase Project Setup

### 1.1 Create project
1. Go to https://supabase.com → New Project
2. Name it `wasel-production` (or `wasel-dev`)
3. Choose a strong database password and save it
4. Choose a region close to Jordan (Frankfurt `eu-central-1` is recommended)

### 1.2 Run the database schema

In Supabase → SQL Editor, run these in order:

**Step 1 — Initial schema**
```sql
-- Copy/paste entire contents of:
backend/supabase/schema.sql
```

**Step 2 — trip_offers and history migration**
```sql
-- Copy/paste entire contents of:
backend/supabase/migrations/001_trip_offers_and_history.sql
```

### 1.3 Collect API keys

Go to Supabase → Settings → API:

| Key | Used by |
|-----|---------|
| Project URL | all apps |
| `publishable` (anon) key | rider app, driver app |
| `service_role` (secret) key | backend only — keep private |

### 1.4 Enable Phone Auth (OTP)

1. Supabase → Authentication → Providers → Phone
2. Enable Phone provider
3. Configure an SMS provider:
   - **Twilio** (recommended): Account SID, Auth Token, From Number
   - **MessageBird**: API key + originator
4. For development, Supabase has a built-in OTP log: Authentication → Logs shows sent OTPs

---

## 2. Backend Setup

```bash
cd backend
npm install
```

### 2.1 Create `.env`

```bash
# backend/.env

# Supabase
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# Server
PORT=3001
NODE_ENV=development

# CORS — add all frontend origins
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

### 2.2 Run backend

```bash
# Development (with hot reload)
npm run dev

# Production build + run
npm run build
npm start
```

Backend runs at: **http://localhost:3001**

### 2.3 Verify backend health

```bash
curl http://localhost:3001/api/health
# → { "status": "ok", "supabase": true, "timestamp": "..." }
```

---

## 3. Rider App Setup

```bash
cd "RIDER/Ride-hailing app for MENA"
npm install
```

### 3.1 Create `.env`

```bash
# RIDER/Ride-hailing app for MENA/.env

VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

### 3.2 Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API** (for address autocomplete)
   - **Geocoding API** (for reverse geocoding)
   - **Directions API** (for route display)
4. Create credentials → API Key
5. Restrict key to HTTP referrers: `http://localhost:5173/*` (dev), your production domain (prod)

### 3.3 Run rider app

```bash
npm run dev
```

Rider app runs at: **http://localhost:5173**

---

## 4. Driver App Setup

```bash
cd driver_app
npm install
```

### 4.1 Create `.env`

```bash
# driver_app/.env

VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_API_URL=http://localhost:3001
```

### 4.2 Run driver app

```bash
npm run dev
```

Driver app runs at: **http://localhost:5174**

---

## 5. Running Everything Together

Open 3 terminal tabs:

```bash
# Tab 1 — Backend
cd backend && npm run dev

# Tab 2 — Rider app
cd "RIDER/Ride-hailing app for MENA" && npm run dev

# Tab 3 — Driver app
cd driver_app && npm run dev
```

Or use the `wasel-dev` skill in Claude Code which starts all three automatically.

---

## 6. Testing the Dispatch System

### 6.1 Create a test driver in Supabase

```sql
-- In Supabase SQL Editor:
INSERT INTO drivers (
  id, phone, full_name, is_online, is_available,
  lat, lng, subscription_tier, acceptance_rate, cancellation_rate,
  trips_last_30_days, idle_minutes
) VALUES (
  gen_random_uuid(),
  '+962799000001',
  'Test Driver',
  true, true,
  31.9539, 35.9106,  -- Amman, Jordan
  2, 0.85, 0.05, 12, 5
);
```

### 6.2 Send a test trip request

```bash
curl -X POST http://localhost:3001/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_lat": 31.9515,
    "pickup_lng": 35.9239,
    "dest_lat": 31.9784,
    "dest_lng": 35.8857,
    "rider_id": "test-rider-001"
  }'
```

Or use the `wasel-dispatch-test` skill in Claude Code.

### 6.3 Verify dispatch log

```bash
curl http://localhost:3001/api/admin/metrics
```

---

## 7. Database Migration Workflow

All migrations live in `backend/supabase/migrations/`. They must be run manually in the Supabase SQL Editor in order.

| File | What it does |
|------|-------------|
| `schema.sql` | Initial tables: drivers, riders, trips, subscriptions, driver_locations, dispatch_log |
| `001_trip_offers_and_history.sql` | Adds trip_offers, trip_status_history, payment_method column; enables Realtime |

**For future migrations**: create `002_...sql`, `003_...sql` etc. and run them in sequence.

---

## 8. Environment Variables Reference

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Service role key for RLS bypass |
| `SUPABASE_PUBLISHABLE_KEY` | Fallback | Anon key (dev fallback if no service key) |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

### Rider App

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key for client auth |
| `VITE_API_URL` | Yes | Backend API base URL |
| `VITE_GOOGLE_MAPS_KEY` | Yes | Google Maps JavaScript API key |

### Driver App

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key for client auth + Realtime |
| `VITE_API_URL` | Yes | Backend API base URL |

---

## 9. Development Modes

### Dev mode (no Supabase configured)
If `SUPABASE_URL` is missing or invalid, the backend falls back to:
- In-memory trip store (data lost on restart)
- Stub auth (any OTP is accepted)
- Console-only dispatch logging
- No Realtime delivery to drivers

This is useful for isolated frontend testing without a database.

### Dev mode with real Supabase
Configure all env vars. Real auth, real dispatch delivery, and real persistence. Requires a Supabase project with migrations applied.

---

## 10. TypeScript Build Verification

```bash
# Backend — check for type errors
cd backend && npx tsc --noEmit

# Driver app
cd driver_app && npx tsc --noEmit

# Rider app — full Vite build
cd "RIDER/Ride-hailing app for MENA" && npx vite build
```

All three should produce zero errors.
