/**
 * Wasel BMP (Best Match Priority) Driver Scoring Algorithm
 *
 * Formula:
 *   score = (w_prox × proximity) + (w_sub × subscription) + (w_act × activity) + (w_idle × idle_bonus)
 *
 * Weights are tuned so that:
 * - Proximity (40%) ensures fast pickups
 * - Subscription tier (30%) monetises the driver subscription model
 * - Activity score (20%) rewards reliable drivers
 * - Idle bonus (10%) prevents driver starvation
 */

import { haversineKm, LatLng } from './geo';

export interface ScoredDriver {
  driverId: string;
  score: number;
  distanceKm: number;
  etaMins: number;
}

interface DriverInput {
  id: string;
  isOnline: boolean;
  isAvailable: boolean;
  location?: LatLng;
  subscriptionTier: 1 | 2 | 3;
  acceptanceRate: number;  // 0–1
  cancellationRate: number; // 0–1
  idleStartedAt?: number;  // timestamp ms
}

const WEIGHTS = {
  proximity: 0.40,
  subscription: 0.30,
  activity: 0.20,
  idle: 0.10,
};

// Tier dispatch priority weights (Tier 3 platinum gets 2.5× boost over Tier 1)
const TIER_WEIGHT: Record<1 | 2 | 3, number> = {
  1: 0.40,
  2: 0.70,
  3: 1.00,
};

const SEARCH_RADIUS_KM = 5;
const IDLE_FULL_BONUS_MINS = 10; // driver earns max idle bonus after 10 min wait

export function scoreDriver(
  driver: DriverInput,
  riderLocation: LatLng,
  now = Date.now()
): ScoredDriver | null {
  if (!driver.isOnline || !driver.isAvailable || !driver.location) return null;

  const distKm = haversineKm(driver.location, riderLocation);
  if (distKm > SEARCH_RADIUS_KM) return null;

  // 1. Proximity — max 1.0 at 0 km, 0.0 at search radius
  const proximityScore = Math.max(0, 1 - distKm / SEARCH_RADIUS_KM);

  // 2. Subscription priority
  const subscriptionScore = TIER_WEIGHT[driver.subscriptionTier];

  // 3. Activity — acceptance minus cancellation rate, clamped 0–1
  const activityScore = Math.max(
    0,
    Math.min(1, driver.acceptanceRate - driver.cancellationRate)
  );

  // 4. Idle time bonus — increases linearly to max after IDLE_FULL_BONUS_MINS
  const idleMins = driver.idleStartedAt
    ? (now - driver.idleStartedAt) / 60_000
    : 0;
  const idleBonus = Math.min(1, idleMins / IDLE_FULL_BONUS_MINS);

  const rawScore =
    WEIGHTS.proximity * proximityScore +
    WEIGHTS.subscription * subscriptionScore +
    WEIGHTS.activity * activityScore +
    WEIGHTS.idle * idleBonus;

  return {
    driverId: driver.id,
    score: Math.round(rawScore * 1000) / 1000,
    distanceKm: Math.round(distKm * 100) / 100,
    etaMins: Math.ceil((distKm / 30) * 60),
  };
}

export function rankDrivers(
  drivers: DriverInput[],
  riderLocation: LatLng
): ScoredDriver[] {
  return drivers
    .map((d) => scoreDriver(d, riderLocation))
    .filter((r): r is ScoredDriver => r !== null)
    .sort((a, b) => b.score - a.score);
}
