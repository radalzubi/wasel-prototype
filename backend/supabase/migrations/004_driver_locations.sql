-- ============================================
-- MIGRATION 004: Driver Location History
-- ============================================

CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id),
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  heading INTEGER DEFAULT 0,
  speed_kmh DECIMAL(6,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE driver_locations
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id);

ALTER TABLE driver_locations
  ADD COLUMN IF NOT EXISTS heading INTEGER DEFAULT 0;

ALTER TABLE driver_locations
  ADD COLUMN IF NOT EXISTS speed_kmh DECIMAL(6,2);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_trip
  ON driver_locations(driver_id, trip_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded
  ON driver_locations(recorded_at DESC);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rider_sees_active_driver_location ON driver_locations;

CREATE POLICY rider_sees_active_driver_location
  ON driver_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM trips
      WHERE trips.driver_id = driver_locations.driver_id
        AND trips.rider_id::text = auth.uid()::text
        AND trips.status IN ('accepted', 'en_route', 'arrived', 'in_progress')
    )
  );
