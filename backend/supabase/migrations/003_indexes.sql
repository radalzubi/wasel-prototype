-- ============================================
-- MIGRATION 003: Performance Indexes
-- ============================================

-- trips table
CREATE INDEX IF NOT EXISTS idx_trips_rider_id ON trips(rider_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_rider_status ON trips(rider_id, status);

-- trip_offers table
CREATE INDEX IF NOT EXISTS idx_trip_offers_driver_id ON trip_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_offers_trip_id ON trip_offers(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_offers_status ON trip_offers(status);
CREATE INDEX IF NOT EXISTS idx_trip_offers_expires ON trip_offers(expires_at)
  WHERE status = 'pending';

-- dispatch_log table
CREATE INDEX IF NOT EXISTS idx_dispatch_log_trip_id ON dispatch_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_log_driver_id ON dispatch_log(driver_id);

-- drivers table
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online, is_available)
  WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
