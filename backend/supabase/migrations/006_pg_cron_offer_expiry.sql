-- ============================================
-- MIGRATION 006: Offer Expiry Cleanup
-- ============================================
-- Ensure pg_cron extension is enabled in Supabase before running.

SELECT cron.schedule(
  'expire-stale-offers',
  '* * * * *',
  $$
    UPDATE trip_offers
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();
  $$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-offers'
);
