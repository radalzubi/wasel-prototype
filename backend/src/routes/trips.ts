import { Router, Request, Response } from 'express';
import { tripStore, driverStore, calculateFare } from '../store/inMemory';
import { dispatchTrip, reDispatchToNextDriver } from '../dispatch_engine';
import { supabase, isSupabaseReady } from '../lib/supabase';
import {
  validateBody,
  TripCreateSchema,
  TripStatusUpdateSchema,
  TripAcceptSchema,
  TripDeclineSchema,
  TripCancelSchema,
} from '../middleware/validate';
import { requireAuth, requireDriver } from '../middleware/auth';
import { log } from '../lib/logger';

const router = Router();
const allowInMemoryFallback = process.env.NODE_ENV === 'development';

const VALID_TRANSITIONS: Record<string, string[]> = {
  requested: ['dispatching', 'cancelled', 'no_driver_found'],
  dispatching: ['accepted', 'cancelled', 'no_driver_found'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_driver_found: [],
};

function assertValidTransition(from: string, to: string): boolean {
  return !!VALID_TRANSITIONS[from]?.includes(to);
}

// ── POST /api/trips — rider creates a ride request ────────────────────────────

router.post('/', requireAuth, validateBody(TripCreateSchema), async (req: Request, res: Response) => {
  const body = req.validatedBody as {
    riderId?: string;
    pickup?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    pickupAddress?: string;
    destinationAddress?: string;
    tier?: 'normal' | 'comfort';
    paymentMethod?: 'cash' | 'cliq';
    pickup_lat?: number;
    pickup_lng?: number;
    dest_lat?: number;
    dest_lng?: number;
    rider_id?: string;
    ride_tier?: 'normal' | 'comfort';
  };
  const {
    riderId, pickup, destination, pickupAddress, destinationAddress,
    tier = 'normal', paymentMethod = 'cash',
    // Accept the dispatch-test snake_case shape too
    pickup_lat, pickup_lng, dest_lat, dest_lng, rider_id, ride_tier,
  } = body;

  // Support both camelCase (frontend) and snake_case (dispatch-test script)
  const effectiveRiderId   = req.userId ?? riderId ?? rider_id ?? 'anonymous';
  const effectivePickup = pickup ?? (
    pickup_lat != null && pickup_lng != null
      ? { lat: pickup_lat, lng: pickup_lng }
      : null
  );
  const effectiveDest = destination ?? (
    dest_lat != null && dest_lng != null
      ? { lat: dest_lat, lng: dest_lng }
      : null
  );
  const effectiveTier      = (tier !== 'normal' ? tier : null) ?? ride_tier ?? 'normal';
  const effectivePayment   = ['cash', 'cliq'].includes(paymentMethod) ? paymentMethod : 'cash';

  if (!effectivePickup || !effectiveDest) {
    return res.status(400).json({
      error: 'pickup and destination are required',
    });
  }

  const estimatedFare = calculateFare(
    effectivePickup,
    effectiveDest,
    effectiveTier as 'normal' | 'comfort',
  );

  let tripId: string;

  if (isSupabaseReady) {
    const { data: row, error } = await supabase!
      .from('trips')
      .insert({
        rider_id:        effectiveRiderId,
        pickup_lat:      effectivePickup.lat,
        pickup_lng:      effectivePickup.lng,
        pickup_address:  pickupAddress ?? 'Pickup',
        dest_lat:        effectiveDest.lat,
        dest_lng:        effectiveDest.lng,
        dest_address:    destinationAddress ?? 'Destination',
        status:          'requested',
        ride_tier:       effectiveTier,
        fare_jd:         estimatedFare,
        payment_method:  effectivePayment,
      })
      .select('id')
      .single();

    if (error || !row) {
      log.error('Trip insert failed', {
        error: error?.message,
        correlationId: req.headers['x-correlation-id'],
      });
      if (!allowInMemoryFallback) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
      const memTrip = tripStore.create({
        riderId: effectiveRiderId, pickup: effectivePickup, destination: effectiveDest,
        pickupAddress: pickupAddress ?? 'Pickup', destinationAddress: destinationAddress ?? 'Destination',
        status: 'REQUESTED', tier: effectiveTier as 'normal' | 'comfort', estimatedFare,
      });
      tripId = memTrip.id;
    } else {
      tripId = row.id;
    }
  } else {
    if (!allowInMemoryFallback) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const memTrip = tripStore.create({
      riderId: effectiveRiderId, pickup: effectivePickup, destination: effectiveDest,
      pickupAddress: pickupAddress ?? 'Pickup', destinationAddress: destinationAddress ?? 'Destination',
      status: 'REQUESTED', tier: effectiveTier as 'normal' | 'comfort', estimatedFare,
    });
    tripId = memTrip.id;
  }

  const result = await dispatchTrip(tripId, effectivePickup);
  res.status(201).json({ tripId, estimatedFare, paymentMethod: effectivePayment, dispatch: result });
});

// ── GET /api/trips — list trips (rider sees their own; admin sees all) ─────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  if (isSupabaseReady) {
    let query = supabase!
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Scope by actor role
    if (req.userId && req.userRole === 'rider') {
      query = query.eq('rider_id', req.userId);
    } else if (req.userId && req.userRole === 'driver') {
      query = query.eq('driver_id', req.userId);
    }

    const { data, error } = await query;
    if (!error && data) return res.json(data);
    log.warn('Trips list failed', { error: error?.message, correlationId: req.headers['x-correlation-id'] });
  }
  if (!allowInMemoryFallback) return res.status(503).json({ error: 'Database unavailable' });
  res.json(tripStore.getAll());
});

// ── GET /api/trips/:id ────────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  if (isSupabaseReady) {
    const { data, error } = await supabase!
      .from('trips')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!error && data) {
      const isRiderOwner = req.userRole === 'rider' && data.rider_id === req.userId;
      const isDriverOwner = req.userRole === 'driver' && data.driver_id === req.userId;
      let hasPendingOffer = false;
      if (!isDriverOwner && req.userRole === 'driver') {
        const { data: offer } = await supabase!
          .from('trip_offers')
          .select('id')
          .eq('trip_id', req.params.id)
          .eq('driver_id', req.userId)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();
        hasPendingOffer = !!offer;
      }
      if (!isRiderOwner && !isDriverOwner && !hasPendingOffer && req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.json(data);
    }
  }
  if (!allowInMemoryFallback) return res.status(503).json({ error: 'Database unavailable' });
  const trip = tripStore.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const riderOwner = req.userRole === 'rider' && trip.riderId === req.userId;
  const driverOwner = req.userRole === 'driver' && trip.driverId === req.userId;
  if (!riderOwner && !driverOwner && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(trip);
});

// ── PATCH /api/trips/:id/status — update trip state ──────────────────────────

const STATUS_TIMESTAMPS: Record<string, string> = {
  accepted:     'accepted_at',
  en_route:     'pickup_at',
  arrived:      'pickup_at',
  in_progress:  'started_at',
  completed:    'completed_at',
  cancelled:    'cancelled_at',
  ACCEPTED:     'accepted_at',
  TRIP_COMPLETED: 'completed_at',
};

router.patch('/:id/status', requireAuth, validateBody(TripStatusUpdateSchema), async (req: Request, res: Response) => {
  const { status, actualFare, cancelReason } = req.validatedBody as {
    status: string;
    actualFare?: number;
    cancelReason?: string;
  };
  const driverId = req.userRole === 'driver' ? req.userId : undefined;
  const now = new Date().toISOString();

  if (isSupabaseReady) {
    const { data: currentTrip, error: currentErr } = await supabase!
      .from('trips')
      .select('id,status,rider_id,driver_id')
      .eq('id', req.params.id)
      .single();
    if (currentErr || !currentTrip) return res.status(404).json({ error: 'Trip not found' });

    const isRiderOwner = req.userRole === 'rider' && currentTrip.rider_id === req.userId;
    const isDriverOwner = req.userRole === 'driver' && currentTrip.driver_id === req.userId;
    if (!isRiderOwner && !isDriverOwner && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.userRole === 'rider' && status !== 'cancelled') {
      return res.status(403).json({ error: 'Riders can only cancel trips from this endpoint' });
    }
    if (req.userRole === 'driver' && !['en_route', 'arrived', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(403).json({ error: 'Drivers cannot perform this status transition' });
    }
    if (!assertValidTransition(String(currentTrip.status), status)) {
      return res.status(400).json({ error: `Invalid trip transition: ${currentTrip.status} -> ${status}` });
    }

    const patch: Record<string, unknown> = { status, updated_at: now };
    const tsField = STATUS_TIMESTAMPS[status];
    if (tsField) patch[tsField] = now;
    if (actualFare !== undefined) patch.fare_jd = actualFare;
    if (cancelReason) patch.cancel_reason = cancelReason;

    const { data, error } = await supabase!
      .from('trips')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();

    if (!error && data) {
      // Write to status history
      supabase!.from('trip_status_history').insert({
        trip_id: req.params.id,
        status,
        actor_id: req.userId ?? null,
        actor_type: req.userRole === 'driver' ? 'driver' : req.userRole === 'rider' ? 'rider' : 'system',
      }).then(({ error: histError }) => {
        if (histError) log.warn('Trip status history insert failed', { error: histError.message });
      });

      if ((status === 'completed' || status === 'cancelled') && currentTrip.driver_id) {
        const availabilityPatch: Record<string, unknown> = { is_available: true };
        if (status === 'completed') {
          const { data: driverRow } = await supabase!
            .from('drivers')
            .select('total_trips,total_earnings')
            .eq('id', currentTrip.driver_id)
            .maybeSingle();
          availabilityPatch.total_trips = Number(driverRow?.total_trips ?? 0) + 1;
          availabilityPatch.total_earnings = Number(driverRow?.total_earnings ?? 0) + Number(data.fare_jd ?? 0);
        }
        await supabase!
          .from('drivers')
          .update(availabilityPatch)
          .eq('id', currentTrip.driver_id)
          .then(({ error: driverPatchError }) => {
            if (driverPatchError) {
              log.warn('Driver availability patch failed after trip status update', { error: driverPatchError.message });
            }
          });
      }

      return res.json(data);
    }
    log.warn('Trip status update failed', { error: error?.message, correlationId: req.headers['x-correlation-id'] });
  }

  // In-memory fallback
  if (!allowInMemoryFallback) return res.status(503).json({ error: 'Database unavailable' });
  const memNow = Date.now();
  const patch: Record<string, unknown> = { status };
  if (driverId) patch.driverId = driverId;
  if (actualFare !== undefined) patch.actualFare = actualFare;
  if (status === 'ACCEPTED') patch.acceptedAt = memNow;
  if (status === 'TRIP_COMPLETED') patch.completedAt = memNow;

  const trip = tripStore.update(
    req.params.id,
    patch as Parameters<typeof tripStore.update>[1],
  );
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

// ── POST /api/trips/:id/accept — driver accepts a trip offer ─────────────────

router.post('/:id/accept', requireDriver, validateBody(TripAcceptSchema), async (req: Request, res: Response) => {
  const { offerId } = req.validatedBody as { offerId?: string };
  const effectiveDriverId = req.userId;

  if (!effectiveDriverId) {
    return res.status(400).json({ error: 'driverId is required' });
  }

  if (isSupabaseReady) {
    // Ensure the authenticated driver owns a pending offer for this trip
    let ownedPendingOfferId: string | null = null;
    if (offerId) {
      const { data: offerRow } = await supabase!
        .from('trip_offers')
        .select('id')
        .eq('id', offerId)
        .eq('trip_id', req.params.id)
        .eq('driver_id', effectiveDriverId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!offerRow) {
        return res.status(403).json({ error: 'Offer not available for this driver' });
      }
      ownedPendingOfferId = offerRow.id;
    } else {
      const { data: offerRow } = await supabase!
        .from('trip_offers')
        .select('id')
        .eq('trip_id', req.params.id)
        .eq('driver_id', effectiveDriverId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!offerRow) {
        return res.status(403).json({ error: 'No pending offer for this driver' });
      }
      ownedPendingOfferId = offerRow.id;
    }

    const { data, error } = await supabase!
      .from('trips')
      .update({
        driver_id: effectiveDriverId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('status', 'dispatching')
      .select()
      .single();

    if (!error && data) {
      await supabase!.from('trip_status_history').insert({
        trip_id: req.params.id,
        status: 'accepted',
        actor_id: effectiveDriverId,
        actor_type: 'driver',
      }).then(({ error: histError }) => {
        if (histError) log.warn('Trip status history insert failed on accept', { error: histError.message });
      });

      await supabase!
        .from('trip_offers')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', ownedPendingOfferId!)
        .then(({ error: offerAcceptError }) => {
          if (offerAcceptError) {
            log.warn('Offer accept update failed', { error: offerAcceptError.message });
          }
        });

      await supabase!
        .from('trip_offers')
        .update({ status: 'expired', responded_at: new Date().toISOString() })
        .eq('trip_id', req.params.id)
        .eq('status', 'pending')
        .neq('driver_id', effectiveDriverId);

      // Mark driver as unavailable
      await supabase!
        .from('drivers')
        .update({ is_available: false })
        .eq('id', effectiveDriverId);

      return res.json({ ok: true, trip: data });
    }
    if (!data) return res.status(409).json({ error: 'Trip already accepted by another driver' });
    log.warn('Trip accept failed', { error: error?.message, correlationId: req.headers['x-correlation-id'] });
  }

  res.json({ ok: true, tripId: req.params.id, driverId: effectiveDriverId });
});

// ── POST /api/trips/:id/decline — driver declines a trip offer ───────────────

router.post('/:id/decline', requireDriver, validateBody(TripDeclineSchema), async (req: Request, res: Response) => {
  const { offerId } = req.validatedBody as { offerId?: string };
  const effectiveDriverId = req.userId;

  if (isSupabaseReady && effectiveDriverId) {
    let touched = false;
    if (offerId) {
      const { data: row } = await supabase!
        .from('trip_offers')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', offerId)
        .eq('trip_id', req.params.id)
        .eq('driver_id', effectiveDriverId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      touched = !!row;
    } else {
      const { data: row } = await supabase!
        .from('trip_offers')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('trip_id', req.params.id)
        .eq('driver_id', effectiveDriverId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      touched = !!row;
    }

    if (!touched) {
      return res.status(403).json({ error: 'No pending offer available to decline' });
    }

    // Re-dispatch to the next-best candidate
    reDispatchToNextDriver(req.params.id).catch(err =>
      log.error('Trip redispatch after decline failed', { error: String(err), tripId: req.params.id }),
    );
  }

  res.json({ ok: true });
});

router.post('/:id/cancel', requireAuth, validateBody(TripCancelSchema), async (req: Request, res: Response) => {
  const { reason } = req.validatedBody as { reason: string };
  if (!isSupabaseReady) {
    if (!allowInMemoryFallback) return res.status(503).json({ error: 'Database unavailable' });
    const cancelled = tripStore.update(req.params.id, {
      status: 'CANCELLED',
      cancelReason: reason,
      cancelledAt: Date.now(),
    } as Parameters<typeof tripStore.update>[1]);
    if (!cancelled) return res.status(404).json({ error: 'Trip not found' });
    return res.json({ ok: true, trip: cancelled });
  }

  const { data: currentTrip, error: currentErr } = await supabase!
    .from('trips')
    .select('id,status,rider_id,driver_id')
    .eq('id', req.params.id)
    .single();
  if (currentErr || !currentTrip) return res.status(404).json({ error: 'Trip not found' });

  const isRiderOwner = req.userRole === 'rider' && currentTrip.rider_id === req.userId;
  const isDriverOwner = req.userRole === 'driver' && currentTrip.driver_id === req.userId;
  if (!isRiderOwner && !isDriverOwner && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!['requested', 'dispatching', 'accepted', 'en_route', 'arrived'].includes(String(currentTrip.status))) {
    return res.status(400).json({ error: 'Trip can no longer be cancelled' });
  }

  const { data, error } = await supabase!
    .from('trips')
    .update({
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error || !data) return res.status(500).json({ error: error?.message ?? 'Cancel failed' });

  await supabase!
    .from('trip_offers')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('trip_id', req.params.id)
    .eq('status', 'pending')
    .then(({ error: offersErr }) => {
      if (offersErr) {
        log.warn('Failed to expire pending offers on cancel', { error: offersErr.message });
      }
    });

  if (currentTrip.driver_id) {
    await supabase!
      .from('drivers')
      .update({ is_available: true })
      .eq('id', currentTrip.driver_id)
      .then(({ error: driverPatchError }) => {
        if (driverPatchError) {
          log.warn('Failed to mark driver available after cancel', { error: driverPatchError.message });
        }
      });
  }

  await supabase!.from('trip_status_history').insert({
    trip_id: req.params.id,
    status: 'cancelled',
    actor_id: req.userId ?? null,
    actor_type: req.userRole === 'driver' ? 'driver' : req.userRole === 'rider' ? 'rider' : 'system',
    metadata: { reason },
  });

  res.json({ ok: true, trip: data });
});

export { router as tripRoutes };
