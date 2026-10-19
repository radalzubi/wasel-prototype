-- ============================================
-- WASEL DATABASE SCHEMA
-- BMP Dispatch + Ride-Hailing for MENA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for geo queries

-- ── RIDERS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(200),
  avatar_url TEXT,
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  preferred_lang VARCHAR(5) DEFAULT 'en',
  saved_home JSONB, -- { lat, lng, label }
  saved_work JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DRIVERS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  avatar_url TEXT,

  -- Vehicle info
  car_make VARCHAR(50),        -- e.g. Toyota
  car_model VARCHAR(50),       -- e.g. Camry
  car_year INTEGER,            -- e.g. 2022
  car_color VARCHAR(30),       -- e.g. White
  car_plate VARCHAR(20),       -- e.g. 12345 A
  car_type VARCHAR(20) DEFAULT 'sedan', -- sedan, suv, van

  -- Status
  is_online BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Location (updated in realtime)
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  heading INTEGER DEFAULT 0,  -- degrees 0-360

  -- BMP Algorithm inputs
  subscription_tier INTEGER DEFAULT 1 CHECK (subscription_tier IN (1, 2, 3)),
  acceptance_rate DECIMAL(5,4) DEFAULT 0.90,   -- 0.0 to 1.0
  cancellation_rate DECIMAL(5,4) DEFAULT 0.05, -- 0.0 to 1.0
  idle_started_at TIMESTAMPTZ,

  -- Stats
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,

  -- Auth
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUBSCRIPTIONS ───────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  tier_name VARCHAR(20) NOT NULL, -- Silver, Gold, Platinum
  price_jd DECIMAL(6,2) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIPS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id UUID,  -- no FK so test trips with non-UUID rider IDs don't fail
  driver_id UUID REFERENCES drivers(id),

  -- Locations
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  pickup_address TEXT,
  dest_lat DECIMAL(10,7) NOT NULL,
  dest_lng DECIMAL(10,7) NOT NULL,
  dest_address TEXT,

  -- Status machine
  status VARCHAR(30) DEFAULT 'requested'
    CHECK (status IN ('requested','dispatching','accepted','en_route','arrived','in_progress','completed','cancelled','no_driver_found')),

  -- BMP dispatch result
  dispatch_score DECIMAL(6,4),
  bmp_proximity_score DECIMAL(6,4),
  bmp_subscription_score DECIMAL(6,4),
  bmp_activity_score DECIMAL(6,4),
  bmp_idle_score DECIMAL(6,4),
  drivers_considered INTEGER DEFAULT 0,

  -- Trip data
  distance_km DECIMAL(8,3),
  duration_mins INTEGER,
  fare_jd DECIMAL(8,2),
  surge_multiplier DECIMAL(4,2) DEFAULT 1.0,
  ride_tier VARCHAR(20) DEFAULT 'standard', -- standard, comfort, premium

  -- Timing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  pickup_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Ratings
  rider_rating DECIMAL(3,2),
  driver_rating DECIMAL(3,2),
  rider_review TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DRIVER LOCATION HISTORY ─────────────────
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id),
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  heading INTEGER DEFAULT 0,
  speed_kmh DECIMAL(6,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DISPATCH LOG ─────────────────────────────
CREATE TABLE IF NOT EXISTS dispatch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id),
  driver_id UUID REFERENCES drivers(id),
  score DECIMAL(6,4) NOT NULL,
  distance_km DECIMAL(8,3),
  eta_mins INTEGER,
  proximity_score DECIMAL(6,4),
  subscription_score DECIMAL(6,4),
  activity_score DECIMAL(6,4),
  idle_score DECIMAL(6,4),
  was_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ───────────────────────
-- Enable RLS (required for Supabase anon key access)
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_log ENABLE ROW LEVEL SECURITY;

-- Strict baseline RLS policies.
-- Backend service-role bypasses RLS automatically and should be used for writes.
DROP POLICY IF EXISTS riders_own_row ON riders;
CREATE POLICY riders_own_row ON riders
  FOR ALL USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

DROP POLICY IF EXISTS drivers_own_row ON drivers;
CREATE POLICY drivers_own_row ON drivers
  FOR ALL USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

DROP POLICY IF EXISTS subscriptions_driver_access ON subscriptions;
CREATE POLICY subscriptions_driver_access ON subscriptions
  FOR SELECT USING (auth.uid()::text = driver_id::text);

DROP POLICY IF EXISTS trips_rider_access ON trips;
CREATE POLICY trips_rider_access ON trips
  FOR SELECT USING (auth.uid()::text = rider_id::text);

DROP POLICY IF EXISTS trips_driver_access ON trips;
CREATE POLICY trips_driver_access ON trips
  FOR SELECT USING (auth.uid()::text = driver_id::text);

DROP POLICY IF EXISTS driver_locations_rider_access ON driver_locations;
CREATE POLICY driver_locations_rider_access ON driver_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.driver_id = driver_locations.driver_id
        AND trips.rider_id::text = auth.uid()::text
        AND trips.status IN ('accepted', 'en_route', 'arrived', 'in_progress')
    )
  );

DROP POLICY IF EXISTS dispatch_log_no_client_access ON dispatch_log;
CREATE POLICY dispatch_log_no_client_access ON dispatch_log
  FOR SELECT USING (false);

-- ── INDEXES ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online, is_available) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(lat, lng) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_trips_rider ON trips(rider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_log_trip ON dispatch_log(trip_id);

-- ── SEED DATA (Amman test drivers) ───────────
INSERT INTO drivers (name, phone, car_make, car_model, car_year, car_color, car_plate, subscription_tier, is_online, is_available, lat, lng, acceptance_rate, cancellation_rate, rating)
VALUES
  ('Ahmad Al-Rashidi', '+96279000001', 'Toyota', 'Camry', 2022, 'White', '12345 A', 3, true, true, 31.9632, 35.9300, 0.95, 0.02, 4.9),
  ('Faris Al-Zoubi', '+96279000002', 'Hyundai', 'Sonata', 2021, 'Silver', '23456 B', 3, true, true, 31.9452, 35.9280, 0.90, 0.05, 4.8),
  ('Khaled Mansour', '+96279000003', 'Kia', 'Optima', 2020, 'Black', '34567 C', 2, true, true, 31.9715, 35.9186, 0.85, 0.08, 4.7),
  ('Omar Al-Habsi', '+96279000004', 'Nissan', 'Altima', 2019, 'Dark Blue', '45678 D', 1, true, true, 31.9602, 35.9052, 0.80, 0.10, 4.6),
  ('Yousef Al-Ahmad', '+96279000005', 'Toyota', 'Corolla', 2023, 'White', '56789 E', 2, true, true, 31.9389, 35.9440, 0.88, 0.06, 4.7)
ON CONFLICT (phone) DO NOTHING;
