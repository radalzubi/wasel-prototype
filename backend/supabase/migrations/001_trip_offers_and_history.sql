-- ============================================
-- MIGRATION 001: Trip Offers + Status History
-- Run this in Supabase SQL Editor after schema.sql
-- ============================================

-- ── TRIP OFFERS ─────────────────────────────
-- Stores real-time dispatch offers sent to drivers.
-- Driver app subscribes to this table via Supabase Realtime.
CREATE TABLE IF NOT EXISTS trip_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,  -- typically NOW() + 15 seconds
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_offers_driver ON trip_offers(driver_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_trip_offers_trip ON trip_offers(trip_id);

-- ── TRIP STATUS HISTORY ──────────────────────
-- Immutable audit log of every trip status transition.
CREATE TABLE IF NOT EXISTS trip_status_history (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(10) CHECK (actor_type IN ('driver', 'rider', 'system')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_trip ON trip_status_history(trip_id, created_at DESC);

-- ── RLS ──────────────────────────────────────
ALTER TABLE trip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_status_history ENABLE ROW LEVEL SECURITY;

-- Backend (service-role key) has full access — no RLS applies to service role.
-- For the anon/publishable key, allow drivers to read their own pending offers:
CREATE POLICY "driver_read_own_offers"
  ON trip_offers FOR SELECT
  USING (driver_id::text = auth.uid()::text OR true);  -- open during beta; tighten post-launch

CREATE POLICY "driver_update_own_offers"
  ON trip_offers FOR UPDATE
  USING (driver_id::text = auth.uid()::text OR true)
  WITH CHECK (true);

CREATE POLICY "all_read_status_history"
  ON trip_status_history FOR SELECT
  USING (true);

CREATE POLICY "backend_insert_status_history"
  ON trip_status_history FOR INSERT
  WITH CHECK (true);

-- ── PAYMENT METHOD on trips ──────────────────
-- Add payment_method column if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE trips ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash'
      CHECK (payment_method IN ('cash', 'cliq'));
  END IF;
END $$;

-- ── Realtime publication ──────────────────────
-- Enable Realtime on trip_offers so drivers receive offers instantly.
-- Run this once; idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trip_offers;
  END IF;
END $$;
