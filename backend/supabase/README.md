# Wasel Supabase Setup

## Quick Setup

1. Go to https://supabase.com and open your project dashboard
2. Go to Settings > API and copy your Project URL (looks like https://xxxxx.supabase.co)
3. Add to backend .env: `SUPABASE_URL=https://xxxxx.supabase.co`
4. Set backend-only `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
5. Run the schema: go to SQL Editor in Supabase, paste contents of `schema.sql` and run
6. Run migrations in order:
   - `migrations/001_trip_offers_and_history.sql`
   - `migrations/002_rls_policies.sql`
   - `migrations/003_indexes.sql`
   - `migrations/004_driver_locations.sql`
   - `migrations/005_rls_hardening.sql`
   - `migrations/006_pg_cron_offer_expiry.sql`
   - `migrations/007_supporting_tables.sql`
   - `migrations/008_realtime_publication.sql`
   - `migrations/009_trip_status_no_driver_found.sql`

## Tables Created
- `riders` — rider accounts and preferences
- `drivers` — driver profiles with vehicle info and BMP inputs
- `vehicles` — normalized vehicle table for driver profiles
- `subscriptions` — Silver/Gold/Platinum subscription records
- `trips` — all trip requests with BMP dispatch audit trail
- `trip_requests` — rider request ledger
- `trip_offers` — realtime dispatch offers
- `trip_status_history` — immutable status audit log
- `driver_locations` — realtime location history
- `dispatch_log` — BMP algorithm scoring log per trip

## BMP Algorithm
score = 0.40×proximity + 0.30×subscription + 0.20×activity + 0.10×idle_bonus

Tier weights: Silver=0.40, Gold=0.70, Platinum=1.00
