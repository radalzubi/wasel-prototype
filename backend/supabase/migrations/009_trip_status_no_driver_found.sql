-- ============================================
-- MIGRATION 009: Trip Status Enum Extension
-- ============================================
-- Allows backend state machine terminal state no_driver_found.

ALTER TABLE trips
  DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE trips
  ADD CONSTRAINT trips_status_check
  CHECK (
    status IN (
      'requested',
      'dispatching',
      'accepted',
      'en_route',
      'arrived',
      'in_progress',
      'completed',
      'cancelled',
      'no_driver_found'
    )
  );
