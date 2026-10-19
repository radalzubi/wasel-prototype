import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isDev = NODE_ENV === 'development';

// Backend must use service-role in production.
// Dev may temporarily fall back to publishable/anon for local smoke flows.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_DEV_FALLBACK_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const effectiveKey =
  SUPABASE_SERVICE_KEY || (isDev ? SUPABASE_DEV_FALLBACK_KEY : '');

if (!SUPABASE_URL || !effectiveKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or API key — using in-memory fallback');
}

if (!SUPABASE_SERVICE_KEY) {
  console.warn('[Supabase] WARNING: No service_role key — backend running in degraded mode. RLS will block writes.');
} else {
  console.info('[Supabase] service_role key loaded');
}

if (!SUPABASE_SERVICE_KEY && !isDev) {
  console.error(
    '[Supabase] SUPABASE_SERVICE_ROLE_KEY is required outside development; backend DB writes are disabled'
  );
}

if (!SUPABASE_SERVICE_KEY && isDev && SUPABASE_DEV_FALLBACK_KEY) {
  console.warn(
    '[Supabase] Development fallback key in use (publishable/anon); set SUPABASE_SERVICE_ROLE_KEY for full behavior'
  );
}

export const supabase =
  SUPABASE_URL && effectiveKey
    ? createClient(SUPABASE_URL, effectiveKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const isSupabaseReady = !!supabase;
