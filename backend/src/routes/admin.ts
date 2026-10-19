/**
 * Admin routes — operational metrics and dispatch testing tools.
 *
 * All admin routes are protected by requireAdmin middleware.
 *
 * Endpoints:
 *   GET  /api/admin/metrics           — operational dashboard data
 *   POST /api/admin/dispatch/override — manually assign a driver to a trip
 *   GET  /api/admin/trips             — full trip list with BMP audit columns
 *   GET  /api/admin/drivers           — all drivers with status
 *   POST /api/admin/pilot/seed        — seed a test scenario for closed-pilot testing
 */

import { Router, Request, Response } from 'express';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { tripStore, driverStore } from '../store/inMemory';
import { requireAdmin } from '../middleware/auth';
import { validateBody, AdminDispatchOverrideSchema } from '../middleware/validate';

const router = Router();

// ── GET /api/admin/metrics ────────────────────────────────────────────────────

router.get('/metrics', requireAdmin, async (_req: Request, res: Response) => {
  if (!isSupabaseReady) {
    // Return in-memory approximations for dev
    const trips = tripStore.getAll();
    return res.json({
      source: 'in-memory',
      totalTrips: trips.length,
      completed: trips.filter(t => t.status === 'TRIP_COMPLETED').length,
      cancelled: trips.filter(t => t.status === 'CANCELLED').length,
      active: trips.filter(t => !['TRIP_COMPLETED', 'CANCELLED'].includes(t.status)).length,
      drivers: {
        total: driverStore.getAll().length,
        online: driverStore.getOnline().length,
      },
    });
  }

  const [
    { count: totalTrips },
    { count: completedTrips },
    { count: cancelledTrips },
    { count: activeTrips },
    { data: dispatchStats },
    { count: onlineDrivers },
    { count: totalDrivers },
  ] = await Promise.all([
    supabase!.from('trips').select('*', { count: 'exact', head: true }),
    supabase!.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase!.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase!
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .in('status', ['requested', 'dispatching', 'accepted', 'en_route', 'arrived', 'in_progress']),
    supabase!
      .from('trips')
      .select('dispatch_score, drivers_considered, bmp_proximity_score')
      .not('dispatch_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase!
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true),
    supabase!.from('drivers').select('*', { count: 'exact', head: true }),
  ]);

  const avgScore =
    dispatchStats && dispatchStats.length > 0
      ? dispatchStats.reduce((s, r) => s + Number(r.dispatch_score ?? 0), 0) /
        dispatchStats.length
      : null;

  const avgDriversConsidered =
    dispatchStats && dispatchStats.length > 0
      ? dispatchStats.reduce((s, r) => s + Number(r.drivers_considered ?? 0), 0) /
        dispatchStats.length
      : null;

  const dispatchSuccessRate =
    totalTrips && totalTrips > 0
      ? Math.round(((completedTrips ?? 0) / totalTrips) * 100)
      : null;

  res.json({
    source: 'supabase',
    trips: {
      total: totalTrips ?? 0,
      completed: completedTrips ?? 0,
      cancelled: cancelledTrips ?? 0,
      active: activeTrips ?? 0,
      dispatchSuccessRatePct: dispatchSuccessRate,
    },
    dispatch: {
      avgBmpScore: avgScore ? Math.round(avgScore * 1000) / 1000 : null,
      avgDriversConsidered: avgDriversConsidered
        ? Math.round(avgDriversConsidered * 10) / 10
        : null,
      recentSamples: (dispatchStats ?? []).length,
    },
    drivers: {
      total: totalDrivers ?? 0,
      online: onlineDrivers ?? 0,
    },
  });
});

// ── POST /api/admin/dispatch/override — manually assign driver ────────────────

router.post('/dispatch/override', requireAdmin, validateBody(AdminDispatchOverrideSchema), async (req: Request, res: Response) => {
  const { tripId, driverId } = req.validatedBody as { tripId: string; driverId: string };

  if (!isSupabaseReady) {
    return res.status(503).json({ error: 'Supabase required for manual override' });
  }

  const now = new Date().toISOString();

  // Reject any pending offers for this trip
  await supabase!
    .from('trip_offers')
    .update({ status: 'expired' })
    .eq('trip_id', tripId)
    .eq('status', 'pending');

  // Create a new offer for the specified driver
  const { error: offerError } = await supabase!.from('trip_offers').insert({
    trip_id: tripId,
    driver_id: driverId,
    status: 'pending',
    expires_at: new Date(Date.now() + 60_000).toISOString(), // 60s for manual override
  });

  if (offerError) {
    return res.status(500).json({ error: offerError.message });
  }

  // Update trip
  const { data, error } = await supabase!
    .from('trips')
    .update({ driver_id: driverId, status: 'dispatching', updated_at: now })
    .eq('id', tripId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log to status history
  await supabase!.from('trip_status_history').insert({
    trip_id: tripId,
    status: 'dispatching',
    actor_type: 'system',
    metadata: { override: true, manual_driver_id: driverId },
  });

  res.json({ ok: true, trip: data, method: 'manual-override' });
});

// ── GET /api/admin/trips ──────────────────────────────────────────────────────

router.get('/trips', requireAdmin, async (_req: Request, res: Response) => {
  if (!isSupabaseReady) {
    return res.json({ source: 'in-memory', trips: tripStore.getAll() });
  }

  const { data, error } = await supabase!
    .from('trips')
    .select('*, dispatch_log(score, driver_id, was_selected)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ source: 'supabase', trips: data });
});

// ── GET /api/admin/drivers ────────────────────────────────────────────────────

router.get('/drivers', requireAdmin, async (_req: Request, res: Response) => {
  if (!isSupabaseReady) {
    return res.json({ source: 'in-memory', drivers: driverStore.getAll() });
  }

  const { data, error } = await supabase!
    .from('drivers')
    .select('*')
    .order('subscription_tier', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ source: 'supabase', drivers: data });
});

// ── GET /api/admin/dispatch-log ───────────────────────────────────────────────

router.get('/dispatch-log', requireAdmin, async (req: Request, res: Response) => {
  if (!isSupabaseReady) return res.json({ source: 'in-memory', entries: [] });

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const { data, error } = await supabase!
    .from('dispatch_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ source: 'supabase', entries: data });
});

export { router as adminRoutes };
