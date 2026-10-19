# Wasel Platform — Architecture Overview

## Stack

| Layer | Technology |
|-------|-----------|
| **Rider app** | React 18 + Vite, Tailwind CSS, Google Maps SDK |
| **Driver app** | React 18 + Vite, Supabase Realtime |
| **Backend API** | Node.js + Express + TypeScript |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **Auth** | Supabase Auth — Phone OTP (SMS) |
| **Real-time** | Supabase Realtime (Postgres Changes on `trip_offers`) |
| **Dispatch** | BMP Algorithm (custom, in-process) |
| **Payments** | Cash + CliQ (field on trip record — gateway TBD) |
| **App Store** | Capacitor wrapper (iOS + Android) — setup ready |

---

## Services

```
localhost:3001  ← Backend Express API
localhost:5173  ← Rider app (Vite)
localhost:5174  ← Driver app (Vite)
```

---

## Dispatch Flow (BMP)

```
1. Rider requests trip  →  POST /api/trips
2. Backend inserts trip row (status: 'requested')
3. dispatchTrip() queries online/available drivers
4. BMP scores each driver:
   score = 0.40×proximity + 0.30×subscription + 0.20×activity + 0.10×idle
5. Winner selected → trip updated (status: 'dispatching', driver_id set)
6. trip_offers row inserted for winner (expires in 15s)
7. Driver app receives offer via Supabase Realtime subscription
8. Driver accepts → POST /api/trips/:id/accept
9. Trip status advances through: accepted → en_route → arrived → in_progress → completed
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `drivers` | Driver profiles, vehicle info, BMP inputs, location |
| `riders` | Rider accounts |
| `trips` | Trip records with BMP audit columns |
| `trip_offers` | Real-time dispatch delivery (Realtime-enabled) |
| `trip_status_history` | Immutable state transition log |
| `subscriptions` | Silver/Gold/Platinum driver subscriptions |
| `driver_locations` | Historical location pings |
| `dispatch_log` | BMP scoring audit trail for every candidate |

---

## Auth Flow

```
1. Client: POST /api/auth/send-otp { phone }
   → Supabase sends SMS OTP via configured provider

2. Client: POST /api/auth/verify { phone, token, role }
   → Returns { session: { access_token, refresh_token }, user: { id, phone } }
   → Creates profile row in drivers or riders table

3. Client stores access_token in localStorage
4. All subsequent API calls: Authorization: Bearer <access_token>
5. Backend: requireAuth middleware validates JWT via Supabase
```

---

## Subscription Tiers (BMP Impact)

| Tier | Name | Dispatch Weight | Monthly Cost |
|------|------|----------------|-------------|
| 1 | Silver | 0.40× | ~20 JD |
| 2 | Gold | 0.70× | ~35 JD |
| 3 | Platinum | 1.00× | ~55 JD |

---

## File Structure

```
Wasel CODE/
├── backend/
│   ├── src/
│   │   ├── index.ts              ← Express entry, security middleware
│   │   ├── middleware/
│   │   │   └── auth.ts           ← JWT validation (requireAuth, requireDriver)
│   │   ├── routes/
│   │   │   ├── auth.ts           ← Phone OTP endpoints
│   │   │   ├── trips.ts          ← Trip CRUD + accept/decline
│   │   │   ├── drivers.ts        ← Driver CRUD + location/status
│   │   │   ├── admin.ts          ← Metrics + dispatch override
│   │   │   └── news.ts           ← Jordan news feed
│   │   ├── dispatch_engine/
│   │   │   ├── index.ts          ← BMP orchestrator + trip_offers delivery
│   │   │   ├── scoring.ts        ← BMP score formula
│   │   │   └── geo.ts            ← Haversine distance
│   │   ├── store/
│   │   │   └── inMemory.ts       ← Dev fallback store
│   │   └── lib/
│   │       └── supabase.ts       ← Supabase client (service-role)
│   └── supabase/
│       ├── schema.sql            ← Initial schema
│       └── migrations/
│           └── 001_trip_offers_and_history.sql
├── driver_app/
│   └── src/
│       ├── App.tsx               ← Auth gate + Realtime subscription
│       ├── contexts/AuthContext.tsx
│       ├── lib/supabase.ts       ← Supabase client (anon key)
│       ├── lib/api.ts            ← REST client
│       └── screens/
│           ├── LoginScreen.tsx   ← Phone OTP auth
│           ├── DashboardScreen.tsx ← Real data + online toggle
│           ├── RideOfferScreen.tsx ← Real trip offer props
│           └── NavigationScreen.tsx ← GPS tracking + trip flow
└── RIDER/Ride-hailing app for MENA/
    └── src/app/
        ├── App.tsx               ← Auth gate
        ├── context/AuthContext.tsx
        └── screens/
            ├── LoginScreen.tsx   ← Phone OTP auth
            └── HomeScreen.tsx    ← Real greeting, session-aware
```
