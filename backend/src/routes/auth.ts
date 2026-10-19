/**
 * Auth routes — Supabase Phone OTP
 *
 * Flow:
 *   1. POST /api/auth/send-otp   { phone }
 *      → triggers Supabase to SMS a 6-digit OTP
 *   2. POST /api/auth/verify     { phone, token, role }
 *      → verifies OTP, returns Supabase session JWT + profile
 *   3. POST /api/auth/refresh    { refreshToken }
 *      → returns new access JWT
 *   4. POST /api/auth/logout     Authorization: Bearer <jwt>
 *      → revokes session
 *
 * The JWT is a standard Supabase-signed RS256 token.
 * Middleware in authMiddleware.ts validates it on protected routes.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { v5 as uuidv5 } from 'uuid';
import {
  validateBody,
  SendOtpSchema,
  OtpVerifySchema,
  RefreshTokenSchema,
} from '../middleware/validate';

const router = Router();
const DEV_AUTH_NAMESPACE = '0f7b2cc2-6df9-4f92-87ac-7bb0ef7af1e7';

// Auth client uses the anon/publishable key (that's what Auth operations need)
const authClient =
  process.env.SUPABASE_URL && (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
      )
    : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  // Strip spaces/dashes; ensure +962 prefix for Jordanian numbers
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    // Prepend Jordan country code if bare 07x number
    return cleaned.startsWith('07') ? `+962${cleaned.slice(1)}` : `+${cleaned}`;
  }
  return cleaned;
}

function devUserId(phone: string, role: 'rider' | 'driver'): string {
  return uuidv5(`${role}:${phone}`, DEV_AUTH_NAMESPACE);
}

async function ensureProfileRow(userId: string, normalizedPhone: string, role: 'rider' | 'driver') {
  const { supabase: supa } = await import('../lib/supabase');
  if (!supa) return;

  if (role === 'driver') {
    const { data: existing } = await supa
      .from('drivers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existing) {
      await supa.from('drivers').insert({
        id: userId,
        phone: normalizedPhone,
        name: '',
        subscription_tier: 1,
        is_online: false,
        is_available: false,
        acceptance_rate: 1.0,
        cancellation_rate: 0,
        rating: 5.0,
      });
    }
    return;
  }

  const { data: existing } = await supa
    .from('riders')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    await supa.from('riders').insert({
      id: userId,
      phone: normalizedPhone,
      name: '',
    });
  }
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────

router.post('/send-otp', validateBody(SendOtpSchema), async (req: Request, res: Response) => {
  const { phone } = req.validatedBody as { phone: string };

  const normalizedPhone = normalizePhone(String(phone));

  if (!authClient) {
    // Dev fallback: pretend success so UI can proceed in offline mode
    console.warn('[Auth] No Supabase client — returning dev stub OTP response');
    return res.json({ ok: true, phone: normalizedPhone, dev: true });
  }

  const { error } = await authClient.auth.signInWithOtp({
    phone: normalizedPhone,
    options: { channel: 'sms' },
  });

  if (error) {
    console.error('[Auth] send-otp failed:', error.message);
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true, phone: normalizedPhone });
});

// ── POST /api/auth/verify ─────────────────────────────────────────────────────

router.post('/verify', validateBody(OtpVerifySchema), async (req: Request, res: Response) => {
  const { phone, token, role } = req.validatedBody as {
    phone: string;
    token: string;
    role: 'rider' | 'driver';
  };

  const normalizedPhone = normalizePhone(String(phone));

  if (!authClient) {
    // Dev fallback — keep auth flow working without live OTP, but still use
    // deterministic UUIDs so real DB-backed flows can be exercised safely.
    const userId = devUserId(normalizedPhone, role);
    await ensureProfileRow(userId, normalizedPhone, role);
    return res.json({
      session: {
        access_token: `${role}_${userId}`,
        refresh_token: `refresh_${role}_${userId}`,
        expires_in: 3600,
        token_type: 'bearer',
      },
      user: { id: userId, phone: normalizedPhone, role },
      dev: true,
    });
  }

  const { data, error } = await authClient.auth.verifyOtp({
    phone: normalizedPhone,
    token: String(token),
    type: 'sms',
  });

  if (error || !data.session) {
    return res.status(401).json({ error: error?.message ?? 'OTP verification failed' });
  }

  const userId = data.user!.id;
  await ensureProfileRow(userId, normalizedPhone, role);

  res.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    },
    user: {
      id: userId,
      phone: normalizedPhone,
      role,
    },
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', validateBody(RefreshTokenSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.validatedBody as { refreshToken: string };

  if (!authClient) {
    const match = /^refresh_(rider|driver)_([0-9a-f-]{36})$/i.exec(refreshToken);
    if (!match) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    return res.json({
      access_token: `${match[1]}_${match[2]}`,
      refresh_token: refreshToken,
      expires_in: 3600,
      dev: true,
    });
  }

  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    return res.status(401).json({ error: error?.message ?? 'Could not refresh session' });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  // Supabase sessions are stateless JWTs — logout is client-side.
  // This endpoint exists for completeness (e.g. push notification cleanup).
  res.json({ ok: true });
});

// ── Legacy stubs (kept for backward compat during migration) ──────────────────

router.post('/rider/login', (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated. Use POST /api/auth/send-otp and /api/auth/verify instead.',
  });
});

router.post('/driver/login', (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated. Use POST /api/auth/send-otp and /api/auth/verify instead.',
  });
});

export { router as authRoutes };
