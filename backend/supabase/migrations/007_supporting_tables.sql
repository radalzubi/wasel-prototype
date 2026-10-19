-- ============================================
-- MIGRATION 007: Supporting MVP Tables
-- ============================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  make VARCHAR(60) NOT NULL,
  model VARCHAR(60) NOT NULL,
  model_year INTEGER,
  color VARCHAR(40),
  plate_number VARCHAR(24) UNIQUE,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);

CREATE TABLE IF NOT EXISTS trip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  dest_lat DECIMAL(10,7) NOT NULL,
  dest_lng DECIMAL(10,7) NOT NULL,
  ride_tier VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'dispatched', 'closed', 'cancelled')),
  trip_id UUID REFERENCES trips(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_requests_rider_id ON trip_requests(rider_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicles_driver_access ON vehicles;
CREATE POLICY vehicles_driver_access ON vehicles
  FOR SELECT USING (auth.uid()::text = driver_id::text);

DROP POLICY IF EXISTS trip_requests_rider_access ON trip_requests;
CREATE POLICY trip_requests_rider_access ON trip_requests
  FOR SELECT USING (auth.uid()::text = rider_id::text);
