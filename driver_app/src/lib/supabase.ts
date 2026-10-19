import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Supabase] Missing env vars — some features will not work');
}

export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_KEY || 'dev');
