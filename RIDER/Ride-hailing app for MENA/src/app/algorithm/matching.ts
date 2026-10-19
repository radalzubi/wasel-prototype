/**
 * matching.ts — Wasel Best Matching Protocol v3.0
 * TypeScript port of wasel_bmp/matching.py
 *
 * Uber-style dispatch (ETA-first) + Wasel tiered subscription program.
 *
 * RIDE PRODUCTS  (rider-facing options)
 *   "normal"   Economy ride — all drivers eligible, fastest pickup
 *              Min rating 4.0 · Min vehicle rating 3.5 · ETA SLA 15 min
 *   "comfort"  Comfort ride — Core + Pro drivers only, premium experience
 *              Min rating 4.6 · Min vehicle rating 4.2 · ETA SLA 12 min
 *
 * DRIVER TIERS  (Wasel subscription)
 *   economy  → Starter  JD 20/mo  cap 6/day   Normal rides only
 *   comfort  → Core     JD 35/mo  cap 9/day   Normal + Comfort
 *   premium  → Pro      JD 55/mo  cap 12/day  Normal + Comfort (first priority)
 */

export type DriverTier = 'economy' | 'comfort' | 'premium';
export type RideProduct = 'normal' | 'comfort';

// ── Tier constants ─────────────────────────────────────────────────────────

export const TIER_RANK: Record<string, number> = {
  economy: 0,
  comfort: 1,
  premium: 2,
};

export const TIER_META: Record<string, {
  name: string;
  driver_label: string;
  fee_jod: number;
  daily_soft_cap: number;
}> = {
  economy: { name: 'Starter',  driver_label: 'Normal Driver',  fee_jod: 20, daily_soft_cap: 6  },
  comfort: { name: 'Core',     driver_label: 'Comfort Driver', fee_jod: 35, daily_soft_cap: 9  },
  premium: { name: 'Pro',      driver_label: 'Comfort Driver', fee_jod: 55, daily_soft_cap: 12 },
};

// ── Ride product definitions ───────────────────────────────────────────────

export const PRODUCT_META: Record<RideProduct, {
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  eligible_tiers: Set<string>;
  min_driver_rating: number;
  min_vehicle_rating: number;
  min_acceptance_rate: number;
  eta_sla_min: number;
}> = {
  normal: {
    label: 'Normal',
    labelAr: 'عادي',
    description: 'Affordable everyday rides — all drivers',
    descriptionAr: 'رحلات يومية ميسورة — جميع السائقين',
    eligible_tiers: new Set(['economy', 'comfort', 'premium']),
    min_driver_rating: 4.0,
    min_vehicle_rating: 3.5,
    min_acceptance_rate: 0.70,
    eta_sla_min: 15,
  },
  comfort: {
    label: 'Comfort',
    labelAr: 'مريح',
    description: 'Core & Pro drivers — extra comfort',
    descriptionAr: 'سائقو كور وبرو — راحة إضافية',
    eligible_tiers: new Set(['comfort', 'premium']),
    min_driver_rating: 4.6,
    min_vehicle_rating: 4.2,
    min_acceptance_rate: 0.75,
    eta_sla_min: 12,
  },
};

const PRODUCT_MIN_TIER_RANK: Record<RideProduct, number> = { normal: 0, comfort: 1 };

// ── Default configuration ──────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  // Geography
  max_radius_km:            8,
  radius_expansion_factor:  1.5,
  max_radius_expansions:    2,
  max_candidates:           40,
  // ETA model (Amman blended avg speed)
  speed_kmph:               24,
  eta_cap_min:              15,
  // Fatigue / shift limits
  shift_max_hours:          10,
  max_shift_hours:          14,
  // Fairness / idle
  fairness_cap:             10,
  idle_cap_min:             30,
  // Consecutive decline penalty (Uber-style)
  consec_decline_threshold: 3,
  consec_decline_penalty:   0.60,
  // Wasel tier preference
  tier_bonus:               { economy: 0.0, comfort: 0.15, premium: 0.30 } as Record<string, number>,
  w_tier:                   0.8,
  upgrade_bonus_per_level:  0.05,
  // Wasel soft-cap (trips/day)
  soft_cap:                 { economy: 6, comfort: 9, premium: 12 } as Record<string, number>,
  soft_cap_penalty:         0.40,
  // Score weights — ETA is primary, matches Uber dispatch philosophy
  w_eta:          2.0,
  w_acceptance:   1.5,
  w_rating:       0.8,
  w_completion:   0.6,
  w_on_time:      0.4,
  w_idle:         0.3,
  w_fairness:     0.3,
  w_consec_decl:  0.5,
  w_shift:        0.4,
  w_heading:      0.2,
  w_dead_mile:    0.15,
};

export type AlgoConfig = Partial<typeof DEFAULT_CONFIG>;

// ── Input/output interfaces ────────────────────────────────────────────────

export interface MatchRequest {
  pickup_lat: number;
  pickup_lng: number;
  product: RideProduct;
  dropoff_lat?: number;
  dropoff_lng?: number;
  pax_count?: number;
  max_wait_min?: number;
  traffic_mult?: number;
  rider_id?: string;
  blacklisted_drivers?: (string | number)[];
  demand_lat?: number;
  demand_lng?: number;
}

export interface AlgoDriver {
  id: string | number;
  lat: number;
  lng: number;
  available: boolean;
  tiers: string[];
  status?: 'idle' | 'returning' | 'on_trip' | 'offline';
  trips_today?: number;
  assigned?: number;
  idle_min?: number;
  shift_hours?: number;
  offered?: number;
  accepted?: number;
  canceled?: number;
  on_time_rate?: number;
  rating?: number;
  vehicle_rating?: number;
  vehicle_seats?: number;
  heading_deg?: number;
  speed_kmph_now?: number;
  consecutive_declines?: number;
}

export interface MatchDebugRow {
  driver_id: string | number;
  driver_tier: string;
  wasel_tier: string;
  score: number;
  eta_min: number;
  dist_km: number;
  acceptance_rate: number;
  _contrib: Record<string, number>;
  [key: string]: unknown;
}

export interface MatchResult {
  best_id: string | number | null;
  ranked_ids: (string | number)[];
  debug: {
    top?: MatchDebugRow[];
    reason?: string;
    product: string;
    radius_km: number;
    attempts: number;
    weights?: Record<string, number>;
  };
}

// ── Pure math helpers ──────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dlat = (lat2 - lat1) * Math.PI / 180;
  const dlon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dlon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dlng = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dlng) * Math.cos(lat2 * Math.PI / 180);
  const x =
    Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dlng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function estimateEtaMin(distKm: number, trafficMult: number, speedKmph: number): number {
  return (distKm / Math.max(speedKmph, 1e-6)) * 60.0 * Math.max(trafficMult, 0.7);
}

// ── Driver-state helpers ───────────────────────────────────────────────────

function driverMaxTier(driver: AlgoDriver): string {
  if (!driver.tiers || driver.tiers.length === 0) return 'economy';
  return driver.tiers.reduce((best, t) =>
    (TIER_RANK[t] ?? 0) > (TIER_RANK[best] ?? 0) ? t : best
  );
}

function canServeProduct(product: RideProduct, driver: AlgoDriver): boolean {
  return PRODUCT_META[product].eligible_tiers.has(driverMaxTier(driver));
}

function computeAcceptanceScore(driver: AlgoDriver): number {
  const offered  = driver.offered  ?? 0;
  const accepted = driver.accepted ?? 0;
  if (offered < 10) return 0.80; // neutral prior for new drivers
  return clamp(accepted / offered, 0, 1);
}

function computeCompletionScore(driver: AlgoDriver): number {
  const accepted = driver.accepted ?? 0;
  const canceled = driver.canceled ?? 0;
  if (accepted < 5) return 0.95; // prior for new drivers
  return clamp(1.0 - canceled / accepted, 0, 1);
}

function computeRatingScore(driver: AlgoDriver): number {
  const dr = clamp(driver.rating ?? 4.0, 1, 5);
  const vr = clamp(driver.vehicle_rating ?? 4.0, 1, 5);
  // 70% driver rating + 30% vehicle condition, mapped to [0, 1]
  return (0.70 * dr + 0.30 * vr - 1.0) / 4.0;
}

function computeShiftFatigue(driver: AlgoDriver, cfg: typeof DEFAULT_CONFIG): number {
  const hours = driver.shift_hours ?? 0;
  const soft  = cfg.shift_max_hours;
  const hard  = cfg.max_shift_hours;
  if (hours <= soft) return 0;
  return clamp((hours - soft) / Math.max(hard - soft, 1e-6), 0, 1);
}

function computeHeadingBonus(driver: AlgoDriver, pickupLat: number, pickupLng: number): number {
  const speed   = driver.speed_kmph_now ?? 0;
  const heading = driver.heading_deg;
  if (speed < 5 || heading == null) return 0;
  const target = bearingDeg(driver.lat, driver.lng, pickupLat, pickupLng);
  let delta = Math.abs(heading - target) % 360;
  if (delta > 180) delta = 360 - delta;
  return clamp(Math.cos(delta * Math.PI / 180), 0, 1);
}

function computeDeadMilePenalty(
  driver: AlgoDriver,
  dropoffLat: number | undefined,
  dropoffLng: number | undefined,
  demandLat: number,
  demandLng: number,
  maxDeadKm = 15,
): number {
  if (dropoffLat == null || dropoffLng == null) return 0;
  const dist = haversineKm(dropoffLat, dropoffLng, demandLat, demandLng);
  return clamp(dist / maxDeadKm, 0, 1);
}

function computeDeclinePenalty(driver: AlgoDriver, cfg: typeof DEFAULT_CONFIG): number {
  const declines  = driver.consecutive_declines ?? 0;
  const threshold = cfg.consec_decline_threshold;
  const maxPen    = cfg.consec_decline_penalty;
  if (declines < threshold) return 0;
  const excess = declines - threshold + 1;
  return clamp(maxPen * excess / 3.0, 0, maxPen);
}

function effectiveTierBonus(driverTier: string, tripsToday: number, cfg: typeof DEFAULT_CONFIG): number {
  const tierBonus = cfg.tier_bonus;
  const softCap   = cfg.soft_cap;
  const penalty   = cfg.soft_cap_penalty;
  const cap       = softCap[driverTier] ?? 999;
  const above     = tripsToday >= cap;

  if (!above) return tierBonus[driverTier] ?? 0;
  if (driverTier === 'premium') return (tierBonus['comfort'] ?? 0.15) - penalty;
  if (driverTier === 'comfort') return (tierBonus['economy'] ?? 0)    - penalty;
  return (tierBonus['economy'] ?? 0) - penalty * 1.5;
}

function tierUpgradeBonus(product: RideProduct, driverTier: string, perLevel: number): number {
  const minRank = PRODUCT_MIN_TIER_RANK[product] ?? 0;
  const delta   = (TIER_RANK[driverTier] ?? 0) - minRank;
  return perLevel * Math.max(delta, 0);
}

// ── Main matching function ─────────────────────────────────────────────────

/**
 * Match one ride request to the best available driver.
 *
 * Returns best_id (null if no match), ranked_ids (best→worst), and debug info.
 */
export function matchRequest(
  request: MatchRequest,
  drivers: AlgoDriver[],
  config: AlgoConfig = {},
): MatchResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const reqProduct = request.product;
  const prodMeta   = PRODUCT_META[reqProduct];

  const pickupLat  = request.pickup_lat;
  const pickupLng  = request.pickup_lng;
  const dropoffLat = request.dropoff_lat;
  const dropoffLng = request.dropoff_lng;
  const paxCount   = request.pax_count ?? 1;
  const traffic    = request.traffic_mult ?? 1.0;
  const blacklist  = new Set(request.blacklisted_drivers ?? []);

  const reqWait = request.max_wait_min ?? prodMeta.eta_sla_min;
  const maxWait = Math.min(reqWait, prodMeta.eta_sla_min);

  const demandLat = request.demand_lat ?? pickupLat;
  const demandLng = request.demand_lng ?? pickupLng;

  // ── Radius expansion loop ─────────────────────────────────────────────────
  let radius     = cfg.max_radius_km;
  const expFactor = cfg.radius_expansion_factor;
  const maxExps   = cfg.max_radius_expansions;

  let feasible: Array<[number, AlgoDriver]> = [];
  let attempt = 0;

  while (attempt <= maxExps) {
    feasible = [];

    for (const d of drivers) {
      // Hard filter 1: availability
      if (!d.available) continue;
      if ((d.status ?? 'idle') === 'on_trip' || d.status === 'offline') continue;

      // Hard filter 2: blacklist
      if (blacklist.has(d.id)) continue;

      // Hard filter 3: product eligibility
      if (!canServeProduct(reqProduct, d)) continue;

      // Hard filter 4: acceptance rate floor (applied when ≥ 10 offers sent)
      const offered  = d.offered  ?? 0;
      const accepted = d.accepted ?? 0;
      if (offered >= 10 && (accepted / offered) < prodMeta.min_acceptance_rate) continue;

      // Hard filter 5: driver rating floor
      if ((d.rating ?? 4.0) < prodMeta.min_driver_rating) continue;

      // Hard filter 6: vehicle condition floor
      if ((d.vehicle_rating ?? 4.0) < prodMeta.min_vehicle_rating) continue;

      // Hard filter 7: vehicle capacity
      if ((d.vehicle_seats ?? 4) < paxCount) continue;

      // Hard filter 8: shift safety hard limit
      if ((d.shift_hours ?? 0) > cfg.max_shift_hours) continue;

      // Hard filter 9: distance / radius
      const distKm = haversineKm(pickupLat, pickupLng, d.lat, d.lng);
      if (distKm > radius) continue;

      feasible.push([distKm, d]);
    }

    if (feasible.length > 0) break;
    if (attempt === maxExps) break;
    radius  *= expFactor;
    attempt += 1;
  }

  if (feasible.length === 0) {
    return {
      best_id: null,
      ranked_ids: [],
      debug: {
        reason: 'no_feasible_drivers',
        product: reqProduct,
        radius_km: radius,
        attempts: attempt + 1,
      },
    };
  }

  // Shortlist: sort by distance (ETA proxy), keep top N
  feasible.sort((a, b) => a[0] - b[0]);
  const shortlist = feasible.slice(0, cfg.max_candidates);

  // ── Score each candidate ───────────────────────────────────────────────────
  const ranked: Array<[number, string | number]> = [];
  const debugRows: MatchDebugRow[] = [];

  for (const [distKm, d] of shortlist) {
    const etaMin = estimateEtaMin(distKm, traffic, cfg.speed_kmph);

    // Hard filter 10: ETA SLA
    if (etaMin > maxWait) continue;

    const etaNorm     = clamp(etaMin / cfg.eta_cap_min, 0, 2);
    const arScore     = computeAcceptanceScore(d);
    const completion  = computeCompletionScore(d);
    const onTime      = d.on_time_rate ?? 0.85;
    const ratingScore = computeRatingScore(d);
    const fatigue     = computeShiftFatigue(d, cfg);
    const headingBon  = computeHeadingBonus(d, pickupLat, pickupLng);
    const deadPen     = computeDeadMilePenalty(d, dropoffLat, dropoffLng, demandLat, demandLng);
    const declinePen  = computeDeclinePenalty(d, cfg);

    const assigned    = d.assigned ?? 0;
    const fairnessPen = clamp(assigned / Math.max(cfg.fairness_cap, 1e-6), 0, 2);
    const idleMin     = d.idle_min ?? 0;
    const idleBonus   = clamp(idleMin / cfg.idle_cap_min, 0, 1);

    const dTier      = driverMaxTier(d);
    const tripsToday = d.trips_today ?? 0;
    const tBonus     = effectiveTierBonus(dTier, tripsToday, cfg);
    const upgrade    = tierUpgradeBonus(reqProduct, dTier, cfg.upgrade_bonus_per_level);
    const tierSignal = tBonus + upgrade;

    // Final score — ETA dominant (primary), acceptance rate secondary
    const score =
      - cfg.w_eta         * etaNorm
      + cfg.w_acceptance  * arScore
      + cfg.w_rating      * ratingScore
      + cfg.w_completion  * completion
      + cfg.w_on_time     * onTime
      + cfg.w_tier        * tierSignal
      + cfg.w_idle        * idleBonus
      - cfg.w_fairness    * fairnessPen
      - cfg.w_consec_decl * declinePen
      - cfg.w_shift       * fatigue
      + cfg.w_heading     * headingBon
      - cfg.w_dead_mile   * deadPen;

    ranked.push([score, d.id]);
    debugRows.push({
      driver_id:       d.id,
      driver_tier:     dTier,
      wasel_tier:      TIER_META[dTier]?.name ?? dTier,
      req_product:     reqProduct,
      dist_km:         Math.round(distKm * 1000) / 1000,
      eta_min:         Math.round(etaMin  * 100)  / 100,
      acceptance_rate: Math.round(arScore * 1000) / 1000,
      score:           Math.round(score * 10000)  / 10000,
      _contrib: {
        ETA:        Math.round(-cfg.w_eta        * etaNorm    * 10000) / 10000,
        Acceptance: Math.round(+cfg.w_acceptance * arScore    * 10000) / 10000,
        Rating:     Math.round(+cfg.w_rating     * ratingScore* 10000) / 10000,
        Completion: Math.round(+cfg.w_completion * completion * 10000) / 10000,
        OnTime:     Math.round(+cfg.w_on_time    * onTime     * 10000) / 10000,
        Tier:       Math.round(+cfg.w_tier       * tierSignal * 10000) / 10000,
        Idle:       Math.round(+cfg.w_idle       * idleBonus  * 10000) / 10000,
        Fairness:   Math.round(-cfg.w_fairness   * fairnessPen* 10000) / 10000,
        Declines:   Math.round(-cfg.w_consec_decl* declinePen * 10000) / 10000,
        Fatigue:    Math.round(-cfg.w_shift      * fatigue    * 10000) / 10000,
        Heading:    Math.round(+cfg.w_heading    * headingBon * 10000) / 10000,
        DeadMile:   Math.round(-cfg.w_dead_mile  * deadPen    * 10000) / 10000,
      },
    });
  }

  if (ranked.length === 0) {
    return {
      best_id: null,
      ranked_ids: [],
      debug: {
        reason: 'all_candidates_failed_sla',
        product: reqProduct,
        radius_km: radius,
        attempts: attempt + 1,
      },
    };
  }

  ranked.sort((a, b) => b[0] - a[0]);
  debugRows.sort((a, b) => b.score - a.score);

  return {
    best_id: ranked[0][1],
    ranked_ids: ranked.map(r => r[1]),
    debug: {
      top: debugRows.slice(0, 10),
      product: reqProduct,
      radius_km: radius,
      attempts: attempt + 1,
      weights: {
        w_eta:        cfg.w_eta,
        w_acceptance: cfg.w_acceptance,
        w_rating:     cfg.w_rating,
        w_tier:       cfg.w_tier,
      },
    },
  };
}
