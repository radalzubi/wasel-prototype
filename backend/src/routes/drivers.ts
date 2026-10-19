import { Router, Request, Response } from 'express';
import { driverStore, tripStore, Driver } from '../store/inMemory';
import { supabase, isSupabaseReady } from '../lib/supabase';
import {
  validateBody,
  LocationUpdateSchema,
  DriverStatusSchema,
  DriverPatchSchema,
} from '../middleware/validate';
import { requireAuth, requireDriver } from '../middleware/auth';
import { log } from '../lib/logger';

const router = Router();

// Map Supabase snake_case row to in-memory Driver shape
function rowToDriver(row: Record<string, unknown>): Driver {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    subscriptionTier: (row.subscription_tier as 1 | 2 | 3) ?? 1,
    isOnline: row.is_online as boolean,
    isAvailable: row.is_available as boolean,
    location: row.lat != null && row.lng != null
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : undefined,
    acceptanceRate: Number(row.acceptance_rate ?? 0.9),
    cancellationRate: Number(row.cancellation_rate ?? 0.05),
    rating: Number(row.rating ?? 5.0),
    totalTrips: Number(row.total_trips ?? 0),
    idleStartedAt: row.idle_started_at ? new Date(row.idle_started_at as string).getTime() : undefined,
    verificationStatus: row.is_verified ? 'approved' : 'pending',
    createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
  } as Driver;
}

function rowToPublicDriver(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    car_make: row.car_make,
    car_model: row.car_model,
    car_color: row.car_color,
    car_plate: row.car_plate,
    rating: row.rating ?? 5.0,
    lat: row.lat,
    lng: row.lng,
    is_online: row.is_online,
    is_available: row.is_available,
  };
}

function inMemoryToPublicDriver(driver: Driver) {
  return {
    id: driver.id,
    name: driver.name,
    rating: driver.rating,
    lat: driver.location?.lat ?? null,
    lng: driver.location?.lng ?? null,
    is_online: driver.isOnline,
    is_available: driver.isAvailable,
  };
}

// GET /api/drivers — list all drivers (admin only)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (isSupabaseReady) {
    const { data, error } = await supabase!.from('drivers').select('*');
    if (!error && data) return res.json(data.map(rowToDriver));
    console.warn('[Drivers] Supabase query failed:', error?.message, '— using in-memory');
  }
  res.json(driverStore.getAll());
});

// GET /api/drivers/online — online drivers only
router.get('/online', requireAuth, async (_req: Request, res: Response) => {
  if (isSupabaseReady) {
    const { data, error } = await supabase!
      .from('drivers')
      .select('*')
      .eq('is_online', true)
      .eq('is_available', true);
    if (!error && data) return res.json(data.map(rowToPublicDriver));
    console.warn('[Drivers] Supabase query failed:', error?.message, '— using in-memory');
  }
  res.json(driverStore.getOnline().map(inMemoryToPublicDriver));
});

// GET /api/drivers/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const isAdmin = req.userRole === 'admin';
  const isOwner = req.userId === req.params.id;

  if (isSupabaseReady) {
    const { data, error } = await supabase!
      .from('drivers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!error && data) {
      if (isAdmin || isOwner) {
        return res.json(rowToDriver(data));
      }

      if (req.userRole === 'rider' && req.userId) {
        const { data: activeTrip } = await supabase!
          .from('trips')
          .select('id')
          .eq('rider_id', req.userId)
          .eq('driver_id', req.params.id)
          .in('status', ['dispatching', 'accepted', 'en_route', 'arrived', 'in_progress'])
          .limit(1)
          .maybeSingle();

        if (activeTrip) {
          return res.json(rowToPublicDriver(data));
        }
      }

      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const driver = driverStore.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  if (isAdmin || isOwner) {
    return res.json(driver);
  }

  if (req.userRole === 'rider' && req.userId) {
    const activeTrip = tripStore.getAll().find(trip =>
      trip.riderId === req.userId &&
      trip.driverId === req.params.id &&
      ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'PASSENGER_PICKED_UP', 'TRIP_IN_PROGRESS'].includes(trip.status)
    );
    if (activeTrip) {
      return res.json(inMemoryToPublicDriver(driver));
    }
  }

  return res.status(403).json({ error: 'Forbidden' });
});

// PATCH /api/drivers/:id/location — real-time location update
router.patch('/:id/location', requireDriver, validateBody(LocationUpdateSchema), async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { lat, lng, tripId, trip_id, heading, speed } = req.validatedBody as {
    lat: number;
    lng: number;
    tripId?: string;
    trip_id?: string;
    heading?: number;
    speed?: number;
  };
  if (isSupabaseReady) {
    const recordedTripId = tripId ?? trip_id;
    if (recordedTripId) {
      const { data: tripRow, error: tripErr } = await supabase!
        .from('trips')
        .select('id,driver_id,status')
        .eq('id', recordedTripId)
        .maybeSingle();
      if (tripErr || !tripRow) {
        return res.status(400).json({ error: 'Invalid trip_id for location update' });
      }
      const isDriverTrip = String(tripRow.driver_id ?? '') === req.params.id;
      const isTrackableStatus = ['accepted', 'en_route', 'arrived', 'in_progress'].includes(String(tripRow.status ?? ''));
      if (!isDriverTrip || !isTrackableStatus) {
        return res.status(403).json({ error: 'Trip is not active for this driver' });
      }
    }

    const { error } = await supabase!
      .from('drivers')
      .update({ lat, lng, last_seen_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (!error) {
      const baseLocationRow = {
        driver_id: req.params.id,
        lat,
        lng,
        heading: Math.round(heading ?? 0),
        speed_kmh: speed ?? null,
      };

      let insertErrorMessage: string | null = null;
      if (recordedTripId) {
        const { error: insertError } = await supabase!
          .from('driver_locations')
          .insert({
            ...baseLocationRow,
            trip_id: recordedTripId,
          });
        insertErrorMessage = insertError?.message ?? null;
      } else {
        const { error: insertError } = await supabase!
          .from('driver_locations')
          .insert(baseLocationRow);
        insertErrorMessage = insertError?.message ?? null;
      }

      if (insertErrorMessage?.includes('trip_id')) {
        const { error: retryError } = await supabase!
          .from('driver_locations')
          .insert(baseLocationRow);
        if (retryError) {
          log.warn('driver_locations insert retry failed', { error: retryError.message });
        } else {
          log.warn('driver_locations trip_id missing from schema cache; inserted location without trip linkage');
        }
      } else if (insertErrorMessage) {
        log.warn('driver_locations insert failed', { error: insertErrorMessage });
      }

      return res.json({ ok: true, location: { lat, lng } });
    }
    log.warn('Driver location update failed', { error: error.message });
  }
  const driver = driverStore.update(req.params.id, { location: { lat, lng } });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json({ ok: true, location: driver.location });
});

// PATCH /api/drivers/:id/status — go online/offline
router.patch('/:id/status', requireDriver, validateBody(DriverStatusSchema), async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { isOnline, isAvailable } = req.validatedBody as { isOnline?: boolean; isAvailable?: boolean };
  if (isSupabaseReady) {
    const patch: Record<string, unknown> = {};
    if (typeof isOnline === 'boolean') patch.is_online = isOnline;
    if (typeof isAvailable === 'boolean') patch.is_available = isAvailable;
    if (isAvailable) patch.idle_started_at = new Date().toISOString();
    const { error } = await supabase!.from('drivers').update(patch).eq('id', req.params.id);
    if (!error) return res.json({ ok: true, isOnline, isAvailable });
    log.warn('Driver status update failed', { error: error.message });
  }
  const patch: Partial<Driver> = {};
  if (typeof isOnline === 'boolean') patch.isOnline = isOnline;
  if (typeof isAvailable === 'boolean') patch.isAvailable = isAvailable;
  if (isAvailable) patch.idleStartedAt = Date.now();
  const driver = driverStore.update(req.params.id, patch);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
});

// PATCH /api/drivers/:id — update driver profile (name, subscription_tier, etc.)
router.patch('/:id', requireAuth, validateBody(DriverPatchSchema), async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const patch = req.validatedBody as { name?: string; subscription_tier?: number };
  if (isSupabaseReady) {
    const { data, error } = await supabase!
      .from('drivers')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (!error && data) return res.json(rowToDriver(data));
    log.warn('Driver patch failed', { error: error?.message });
  }
  // In-memory fallback
  const inMemPatch: Partial<Driver> = {};
  if (patch.name)              inMemPatch.name = patch.name as string;
  if (patch.subscription_tier) inMemPatch.subscriptionTier = patch.subscription_tier as 1 | 2 | 3;
  const driver = driverStore.update(req.params.id, inMemPatch);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
});

// POST /api/drivers — register new driver
router.post('/', async (req: Request, res: Response) => {
  const { name, phone, carMake, carModel, carYear, carColor, carPlate } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }
  if (isSupabaseReady) {
    const { data, error } = await supabase!
      .from('drivers')
      .insert({
        name, phone,
        car_make: carMake, car_model: carModel, car_year: carYear,
        car_color: carColor, car_plate: carPlate,
        subscription_tier: 1, is_online: false, is_available: false,
        acceptance_rate: 1.0, cancellation_rate: 0, rating: 5.0,
      })
      .select()
      .single();
    if (!error && data) return res.status(201).json(rowToDriver(data));
    log.warn('Driver insert failed', { error: error?.message });
  }
  const driver = driverStore.create({
    name, phone,
    subscriptionTier: 1, isOnline: false, isAvailable: false,
    acceptanceRate: 1.0, cancellationRate: 0, rating: 5.0,
    totalTrips: 0, verificationStatus: 'pending',
  });
  res.status(201).json(driver);
});

// GET /api/drivers/:id/trips — driver trip history
router.get('/:id/trips', requireDriver, async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isSupabaseReady) return res.json([]);

  const { data, error } = await supabase!
    .from('trips')
    .select('*')
    .eq('driver_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// GET /api/drivers/:id/earnings — MVP summary
router.get('/:id/earnings', requireDriver, async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isSupabaseReady) {
    return res.json({ totalTrips: 0, totalEarnings: 0, thisWeekEarnings: 0 });
  }

  const { data, error } = await supabase!
    .from('trips')
    .select('fare_jd,completed_at,status')
    .eq('driver_id', req.params.id)
    .eq('status', 'completed');
  if (error) return res.status(500).json({ error: error.message });

  const rows = data ?? [];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const totalEarnings = rows.reduce((sum, t) => sum + Number(t.fare_jd ?? 0), 0);
  const thisWeekEarnings = rows
    .filter(t => t.completed_at && new Date(String(t.completed_at)) >= weekStart)
    .reduce((sum, t) => sum + Number(t.fare_jd ?? 0), 0);

  res.json({
    totalTrips: rows.length,
    totalEarnings: Number(totalEarnings.toFixed(3)),
    thisWeekEarnings: Number(thisWeekEarnings.toFixed(3)),
  });
});

// GET /api/drivers/:id/offers/pending — polling fallback when realtime is unavailable
router.get('/:id/offers/pending', requireDriver, async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isSupabaseReady) return res.json([]);
  const { data, error } = await supabase!
    .from('trip_offers')
    .select('*')
    .eq('driver_id', req.params.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

export { router as driverRoutes };
