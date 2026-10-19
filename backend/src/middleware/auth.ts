/**
 * JWT Auth Middleware — validates Supabase-issued Bearer tokens.
 *
 * Usage:
 *   import { requireAuth } from '../middleware/auth';
 *   router.patch('/:id/status', requireAuth, handler);
 *
 * On success injects req.userId and req.userRole into the request.
 * In dev mode (no Supabase), accepts any non-empty token for convenience.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Extend Express Request to carry auth context
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: 'rider' | 'driver' | 'admin';
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

// Auth-validation client uses the anon key (required for getUser)
const authClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const DEV_MODE = !authClient;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (DEV_MODE) {
  console.warn('[Auth] No Supabase client — requireAuth will accept any Bearer token in dev mode');
}

async function resolveRole(userId: string): Promise<'rider' | 'driver' | 'admin'> {
  if (supabase) {
    const [{ data: driver }, { data: rider }] = await Promise.all([
      supabase.from('drivers').select('id').eq('id', userId).maybeSingle(),
      supabase.from('riders').select('id').eq('id', userId).maybeSingle(),
    ]);
    if (driver) return 'driver';
    if (rider) return 'rider';
  }
  return 'rider';
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }

  const token = authHeader.slice(7);

  if (DEV_MODE) {
    // Dev mode: accept any non-empty token; allow explicit UUID user IDs
    // via rider_<uuid>/driver_<uuid>/admin_<uuid> token patterns.
    let role: 'rider' | 'driver' | 'admin' = 'rider';
    let candidate = token;
    if (token.startsWith('driver_')) {
      role = 'driver';
      candidate = token.slice('driver_'.length);
    } else if (token.startsWith('admin_')) {
      role = 'admin';
      candidate = token.slice('admin_'.length);
    } else if (token.startsWith('rider_')) {
      role = 'rider';
      candidate = token.slice('rider_'.length);
    }
    req.userId = UUID_RE.test(candidate) ? candidate : `dev-${token.slice(0, 12)}`;
    req.userRole = role;
    return next();
  }

  const { data: { user }, error } = await authClient!.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = user.id;
  // Role fallback: metadata first, database lookup second.
  req.userRole = (user.user_metadata?.role as 'rider' | 'driver' | 'admin') ?? await resolveRole(user.id);
  next();
}

/** Like requireAuth but only allows driver role */
export async function requireDriver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.userRole !== 'driver' && req.userRole !== 'admin') {
      res.status(403).json({ error: 'Driver access required' });
      return;
    }
    next();
  });
}

/** Like requireAuth but only allows admin role */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}
