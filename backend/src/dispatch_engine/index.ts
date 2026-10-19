import { rankDrivers, ScoredDriver } from './scoring';
import { LatLng } from './geo';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { driverStore } from '../store/inMemory';

interface DispatchableDriver {
  id: string;
  isOnline: boolean;
  isAvailable: boolean;
  location?: LatLng;
  subscriptionTier: 1 | 2 | 3;
  acceptanceRate: number;
  cancellationRate: number;
  idleStartedAt?: number;
}

export interface DispatchResult {
  tripId: string;
  rankedDrivers: ScoredDriver[];
  offeredTo: string | null;
  searchRadiusKm: number;
  source: 'supabase' | 'in-memory';
}

// ── Supabase driver row shape ─────────────────────────────────────────────────

interface SupabaseDriverRow {
  id: string;
  is_online: boolean;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  subscription_tier: number;
  acceptance_rate: number;
  cancellation_rate: number;
  idle_started_at: string | null;
}

function supabaseRowToDispatchable(row: SupabaseDriverRow): DispatchableDriver {
  return {
    id: row.id,
    isOnline: row.is_online,
    isAvailable: row.is_available,
    location: row.lat != null && row.lng != null
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : undefined,
    subscriptionTier: (row.subscription_tier as 1 | 2 | 3) ?? 1,
    acceptanceRate: Number(row.acceptance_rate ?? 0.9),
    cancellationRate: Number(row.cancellation_rate ?? 0.05),
    idleStartedAt: row.idle_started_at
      ? new Date(row.idle_started_at).getTime()
      : undefined,
  };
}

// ── Supabase dispatch path ────────────────────────────────────────────────────

async function dispatchFromSupabase(
  tripId: string,
  riderLocation: LatLng,
): Promise<DispatchResult> {
  const { data: rows, error } = await supabase!
    .from('drivers')
    .select('id, is_online, is_available, lat, lng, subscription_tier, acceptance_rate, cancellation_rate, idle_started_at')
    .eq('is_online', true)
    .eq('is_available', true);

  if (error) {
    console.error('[Dispatch] Supabase query failed, falling back to in-memory:', error.message);
    return dispatchFromMemory(tripId, riderLocation, 'supabase-fallback');
  }

  const drivers = (rows as SupabaseDriverRow[]).map(supabaseRowToDispatchable);
  const now = Date.now();
  const ranked = rankDrivers(drivers, riderLocation);
  const winner = ranked[0] ?? null;

  // Log all scored candidates to dispatch_log
  if (ranked.length > 0) {
    const logRows = ranked.map((d, idx) => {
      const raw = drivers.find(dr => dr.id === d.driverId)!;
      return {
        trip_id: tripId,
        driver_id: d.driverId,
        score: d.score,
        distance_km: d.distanceKm,
        eta_mins: d.etaMins,
        proximity_score: Math.max(0, 1 - d.distanceKm / 5),
        subscription_score: [0.40, 0.70, 1.00][raw.subscriptionTier - 1],
        activity_score: Math.max(0, Math.min(1, raw.acceptanceRate - raw.cancellationRate)),
        idle_score: raw.idleStartedAt
          ? Math.min(1, (now - raw.idleStartedAt) / 60_000 / 10)
          : 0,
        was_selected: idx === 0,
      };
    });

    const { error: logError } = await supabase!
      .from('dispatch_log')
      .insert(logRows);

    if (logError) {
      console.warn('[Dispatch] Failed to write dispatch_log:', logError.message);
    }

    // Update trip with BMP audit columns and deliver offer to winner
    if (winner) {
      const winnerDriver = drivers.find(d => d.id === winner.driverId)!;
      const proximityScore = Math.max(0, 1 - winner.distanceKm / 5);
      const subscriptionScore = [0.40, 0.70, 1.00][winnerDriver.subscriptionTier - 1];
      const activityScore = Math.max(0, Math.min(1, winnerDriver.acceptanceRate - winnerDriver.cancellationRate));
      const idleScore = winnerDriver.idleStartedAt
        ? Math.min(1, (now - winnerDriver.idleStartedAt) / 60_000 / 10)
        : 0;

      await supabase!
        .from('trips')
        .update({
          driver_id: winner.driverId,
          status: 'dispatching',
          dispatch_score: winner.score,
          bmp_proximity_score: proximityScore,
          bmp_subscription_score: subscriptionScore,
          bmp_activity_score: activityScore,
          bmp_idle_score: idleScore,
          drivers_considered: ranked.length,
        })
        .eq('id', tripId);

      // Deliver offer via Realtime — driver app subscribes to trip_offers
      const OFFER_TTL_SECONDS = 15;
      const expiresAt = new Date(Date.now() + OFFER_TTL_SECONDS * 1000).toISOString();
      const { error: offerError } = await supabase!.from('trip_offers').insert({
        trip_id: tripId,
        driver_id: winner.driverId,
        status: 'pending',
        expires_at: expiresAt,
      });
      if (offerError) {
        console.warn('[Dispatch] Failed to insert trip_offer:', offerError.message);
      } else {
        console.log(`[Dispatch] Offer sent to driver ${winner.driverId}`);
      }
    }
  }

  return {
    tripId,
    rankedDrivers: ranked,
    offeredTo: winner?.driverId ?? null,
    searchRadiusKm: 5,
    source: 'supabase',
  };
}

// ── In-memory dispatch path ───────────────────────────────────────────────────

function dispatchFromMemory(
  tripId: string,
  riderLocation: LatLng,
  _source: string = 'in-memory',
): DispatchResult {
  const onlineDrivers = driverStore.getOnline();

  const dispatchable: DispatchableDriver[] = onlineDrivers.map(d => ({
    id: d.id,
    isOnline: d.isOnline,
    isAvailable: d.isAvailable,
    location: d.location,
    subscriptionTier: d.subscriptionTier,
    acceptanceRate: d.acceptanceRate,
    cancellationRate: d.cancellationRate,
    idleStartedAt: d.idleStartedAt,
  }));

  const ranked = rankDrivers(dispatchable, riderLocation);

  return {
    tripId,
    rankedDrivers: ranked,
    offeredTo: ranked[0]?.driverId ?? null,
    searchRadiusKm: 5,
    source: 'in-memory',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * dispatchTrip — selects the best available driver for a trip using the
 * Wasel BMP (Best Match Priority) algorithm.
 *
 * Uses Supabase when credentials are configured, otherwise falls back to
 * the in-memory store so the server works without a database.
 */
export async function dispatchTrip(
  tripId: string,
  riderLocation: LatLng,
): Promise<DispatchResult> {
  if (isSupabaseReady) {
    return dispatchFromSupabase(tripId, riderLocation);
  }
  return dispatchFromMemory(tripId, riderLocation);
}

// ── Re-dispatch to next-ranked candidate ──────────────────────────────────────

/**
 * reDispatchToNextDriver — called when a driver declines or their offer expires.
 * Looks up the next-ranked candidate from dispatch_log that hasn't been offered
 * yet, creates a new trip_offer row (firing Realtime), and updates the trip.
 */
export async function reDispatchToNextDriver(tripId: string): Promise<void> {
  if (!isSupabaseReady) return;

  // All ranked candidates from the original dispatch run
  const { data: logRows } = await supabase!
    .from('dispatch_log')
    .select('driver_id, score')
    .eq('trip_id', tripId)
    .order('score', { ascending: false });

  if (!logRows || logRows.length === 0) {
    console.log(`[Re-dispatch] No dispatch_log entries for trip ${tripId}`);
    await supabase!.from('trips').update({ status: 'no_driver_found' }).eq('id', tripId);
    return;
  }

  // Drivers already offered this trip (any terminal status)
  const { data: existingOffers } = await supabase!
    .from('trip_offers')
    .select('driver_id, status')
    .eq('trip_id', tripId);

  const alreadyOffered = new Set(
    (existingOffers ?? [])
      .filter((o: Record<string, string>) => ['rejected', 'expired', 'accepted'].includes(o.status))
      .map((o: Record<string, string>) => o.driver_id),
  );

  // Check the trip still needs a driver (not already accepted)
  const { data: trip } = await supabase!
    .from('trips')
    .select('status')
    .eq('id', tripId)
    .single();

  if (!trip || ['accepted', 'completed', 'cancelled'].includes(trip.status as string)) {
    console.log(`[Re-dispatch] Trip ${tripId} is already in terminal state: ${trip?.status}`);
    return;
  }

  const nextCandidate = (logRows as Array<{ driver_id: string; score: number }>)
    .find(r => !alreadyOffered.has(r.driver_id));

  if (!nextCandidate) {
    console.log(`[Re-dispatch] All ${logRows.length} candidates exhausted for trip ${tripId}`);
    await supabase!.from('trips').update({ status: 'no_driver_found' }).eq('id', tripId);
    return;
  }

  const OFFER_TTL_SECONDS = 15;
  const expiresAt = new Date(Date.now() + OFFER_TTL_SECONDS * 1000).toISOString();

  const { error: offerError } = await supabase!.from('trip_offers').insert({
    trip_id: tripId,
    driver_id: nextCandidate.driver_id,
    status: 'pending',
    expires_at: expiresAt,
  });

  if (offerError) {
    console.error(`[Re-dispatch] Failed to insert offer: ${offerError.message}`);
    return;
  }

  await supabase!
    .from('trips')
    .update({ driver_id: nextCandidate.driver_id, status: 'dispatching' })
    .eq('id', tripId);

  console.log(`[Re-dispatch] Trip ${tripId} → driver ${nextCandidate.driver_id} (score: ${nextCandidate.score.toFixed(3)})`);
}

/**
 * expireStaleOffers — call on a short interval (e.g. every 8s) to mark
 * pending offers past their TTL as 'expired' and trigger re-dispatch.
 */
export async function expireStaleOffers(): Promise<void> {
  if (!isSupabaseReady) return;

  const { data: stale } = await supabase!
    .from('trip_offers')
    .select('id, trip_id, driver_id')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  if (!stale || stale.length === 0) return;

  console.log(`[Expiry] Expiring ${stale.length} stale offer(s)`);
  for (const offer of stale as Array<{ id: string; trip_id: string; driver_id: string }>) {
    await supabase!
      .from('trip_offers')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', offer.id);

    await reDispatchToNextDriver(offer.trip_id);
  }
}

/**
 * dispatch — legacy synchronous wrapper kept for backward compatibility
 * with any existing route handlers that call it directly.
 * Prefer dispatchTrip() for new code.
 */
export function dispatch(
  tripId: string,
  riderLocation: LatLng,
  availableDrivers: DispatchableDriver[]
): Omit<DispatchResult, 'source'> {
  const ranked = rankDrivers(availableDrivers, riderLocation);
  return {
    tripId,
    rankedDrivers: ranked,
    offeredTo: ranked[0]?.driverId ?? null,
    searchRadiusKm: 5,
  };
}
