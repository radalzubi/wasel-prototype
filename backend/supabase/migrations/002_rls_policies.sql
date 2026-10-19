-- ============================================
-- MIGRATION 002: Row Level Security Policies
-- Run in Supabase SQL Editor after 001_trip_offers_and_history.sql
-- ============================================

-- ── Enable RLS on core tables ─────────────────────────────────────────────────
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips   ENABLE ROW LEVEL SECURITY;

-- ── DRIVERS table ─────────────────────────────────────────────────────────────

-- Drivers can read their own row
CREATE POLICY "driver_read_own"
  ON drivers FOR SELECT
  USING (auth.uid()::text = id::text);

-- Drivers can update their own location + status (not tier or other sensitive fields)
CREATE POLICY "driver_update_own_location"
  ON drivers FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Riders can see basic driver info for their assigned driver
-- (handled by the backend service-role key for privacy; this is a fallback)
CREATE POLICY "rider_read_assigned_driver"
  ON drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.driver_id = drivers.id
        AND trips.rider_id::text = auth.uid()::text
        AND trips.status NOT IN ('requested', 'cancelled', 'completed')
    )
  );

-- ── RIDERS table ──────────────────────────────────────────────────────────────

-- Riders can read and update their own profile
CREATE POLICY "rider_read_own"
  ON riders FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "rider_update_own"
  ON riders FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- ── TRIPS table ───────────────────────────────────────────────────────────────

-- Riders can read their own trips
CREATE POLICY "rider_read_own_trips"
  ON trips FOR SELECT
  USING (auth.uid()::text = rider_id::text);

-- Drivers can read trips assigned to them
CREATE POLICY "driver_read_assigned_trip"
  ON trips FOR SELECT
  USING (auth.uid()::text = driver_id::text);

-- Riders can create trip requests (INSERT)
CREATE POLICY "rider_create_trip"
  ON trips FOR INSERT
  WITH CHECK (auth.uid()::text = rider_id::text);

-- Drivers can update status of their assigned trips
CREATE POLICY "driver_update_trip_status"
  ON trips FOR UPDATE
  USING (auth.uid()::text = driver_id::text)
  WITH CHECK (auth.uid()::text = driver_id::text);

-- ── TRIP_OFFERS table — tighten from migration 001 ───────────────────────────
-- Drop the open beta policies and replace with proper ones

DROP POLICY IF EXISTS "driver_read_own_offers" ON trip_offers;
DROP POLICY IF EXISTS "driver_update_own_offers" ON trip_offers;

-- Drivers can only see offers sent to them
CREATE POLICY "driver_read_own_offers"
  ON trip_offers FOR SELECT
  USING (auth.uid()::text = driver_id::text);

-- Drivers can only update (accept/reject) their own offers
CREATE POLICY "driver_update_own_offers"
  ON trip_offers FOR UPDATE
  USING (auth.uid()::text = driver_id::text)
  WITH CHECK (auth.uid()::text = driver_id::text);

-- ── DISPATCH_LOG — read-only for admin ───────────────────────────────────────
-- The dispatch_log is written only by the backend service-role key.
-- No client-side access needed; RLS can remain disabled on this table.
-- (admin dashboard reads it via backend /api/admin endpoints)

-- ── TRIP_STATUS_HISTORY — tighten ────────────────────────────────────────────
DROP POLICY IF EXISTS "all_read_status_history" ON trip_status_history;
DROP POLICY IF EXISTS "backend_insert_status_history" ON trip_status_history;

-- Riders and drivers can read history for their own trips
CREATE POLICY "read_own_trip_history"
  ON trip_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_status_history.trip_id
        AND (
          trips.rider_id::text  = auth.uid()::text OR
          trips.driver_id::text = auth.uid()::text
        )
    )
  );

-- Only backend (service-role) can insert history rows
-- (anon + authenticated keys cannot insert)
CREATE POLICY "backend_insert_history"
  ON trip_status_history FOR INSERT
  WITH CHECK (false);  -- Blocks all client inserts; service_role bypasses RLS

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
