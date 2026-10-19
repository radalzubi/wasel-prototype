-- ============================================
-- MIGRATION 005: RLS Hardening
-- ============================================

ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Remove permissive policies from schema/bootstrap files
DROP POLICY IF EXISTS backend_all_riders ON riders;
DROP POLICY IF EXISTS backend_all_drivers ON drivers;
DROP POLICY IF EXISTS backend_all_subscriptions ON subscriptions;
DROP POLICY IF EXISTS backend_all_trips ON trips;
DROP POLICY IF EXISTS backend_all_driver_locations ON driver_locations;
DROP POLICY IF EXISTS backend_all_dispatch_log ON dispatch_log;

DROP POLICY IF EXISTS riders_own_row ON riders;
CREATE POLICY riders_own_row ON riders
  FOR ALL USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

DROP POLICY IF EXISTS drivers_own_row ON drivers;
CREATE POLICY drivers_own_row ON drivers
  FOR ALL USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

DROP POLICY IF EXISTS trips_rider_access ON trips;
CREATE POLICY trips_rider_access ON trips
  FOR SELECT USING (auth.uid()::text = rider_id::text);

DROP POLICY IF EXISTS trips_driver_access ON trips;
CREATE POLICY trips_driver_access ON trips
  FOR SELECT USING (auth.uid()::text = driver_id::text);

DROP POLICY IF EXISTS trip_offers_driver_access ON trip_offers;
CREATE POLICY trip_offers_driver_access ON trip_offers
  FOR SELECT USING (auth.uid()::text = driver_id::text);
