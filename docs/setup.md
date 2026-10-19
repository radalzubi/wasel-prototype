# Wasel Local Setup

## Prerequisites
- Node.js 20+
- npm 10+
- Supabase project (URL + anon key + service role key)
- Google Maps API key (Places + Maps JS)
- Xcode 16+ (for iOS testing)

## 1) Backend
```bash
cd /Users/radalzubi/Desktop/Wasel\ CODE/backend
cp .env.example .env
# Fill values (especially SUPABASE_SERVICE_ROLE_KEY)
npm install
npm run dev
```
Backend runs at `http://localhost:3001`.

## 2) Driver App
```bash
cd /Users/radalzubi/Desktop/Wasel\ CODE/driver_app
npm install
npm run dev
```
Default web dev port: `5174`.

## 3) Rider App
```bash
cd "/Users/radalzubi/Desktop/Wasel CODE/RIDER/Ride-hailing app for MENA"
npm install
npm run dev
```
Default web dev port: `5173` (Vite default unless changed).

## 4) Supabase Migrations (manual)
Apply SQL files in this order from `backend/supabase/migrations`:
1. `001_trip_offers_and_history.sql`
2. `002_rls_policies.sql`
3. `003_indexes.sql`
4. `004_driver_locations.sql`
5. `005_rls_hardening.sql`
6. `006_pg_cron_offer_expiry.sql`
7. `007_supporting_tables.sql`
8. `008_realtime_publication.sql`
9. `009_trip_status_no_driver_found.sql`

## 5) Realtime replication
Enable replication for:
- `trip_offers` (INSERT/UPDATE)
- `trips` (UPDATE)
- `driver_locations` (INSERT)

The SQL migration `008_realtime_publication.sql` also adds these tables to `supabase_realtime` publication when run in SQL Editor.

## 6) Local end-to-end smoke flow
1. Login rider via OTP.
2. Login driver via OTP and go online.
3. Rider creates trip.
4. Driver receives and accepts offer.
5. Driver progresses to `en_route`, `arrived`, `in_progress`, `completed`.
6. Rider sees state updates and map movement.
