# Algorithm Integration & Frontend Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the Wasel BMP v3.0 matching algorithm to TypeScript, wire it into the booking flow, fix the ride product model to 2 options (normal/comfort), and complete all unfinished Settings screens.

**Architecture:** TypeScript port of `matching.py` lives at `src/app/algorithm/matching.ts` and runs client-side. `mockData.ts` is updated with 2 ride products and enriched driver data. `HomeScreen.tsx` uses the algorithm in `handleConfirmRide`. `SettingsScreen.tsx` gains Notifications and BecomeDriver sub-screens.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Leaflet

---

### Task 1: Create the TypeScript algorithm module

**Files:**
- Create: `src/app/algorithm/matching.ts`

Port `wasel_bmp/matching.py` to TypeScript verbatim — same logic, same constants, same naming.

**Step 1: Create the file with all types and constants**

```typescript
// src/app/algorithm/matching.ts
// Wasel Best Matching Protocol v3.0 — TypeScript port

export type DriverTier = 'economy' | 'comfort' | 'premium';
export type RideProduct = 'normal' | 'comfort';

export const TIER_RANK: Record<string, number> = {
  economy: 0,
  comfort: 1,
  premium: 2,
};

export const TIER_META: Record<string, { name: string; driver_label: string; fee_jod: number; daily_soft_cap: number }> = {
  economy: { name: 'Starter',  driver_label: 'Normal Driver',  fee_jod: 20, daily_soft_cap: 6  },
  comfort: { name: 'Core',     driver_label: 'Comfort Driver', fee_jod: 35, daily_soft_cap: 9  },
  premium: { name: 'Pro',      driver_label: 'Comfort Driver', fee_jod: 55, daily_soft_cap: 12 },
};

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
    description: 'Affordable everyday rides',
    descriptionAr: 'رحلات يومية ميسورة',
    eligible_tiers: new Set(['economy', 'comfort', 'premium']),
    min_driver_rating: 4.0,
    min_vehicle_rating: 3.5,
    min_acceptance_rate: 0.70,
    eta_sla_min: 15,
  },
  comfort: {
    label: 'Comfort',
    labelAr: 'مريح',
    description: 'Core & Pro drivers — more space',
    descriptionAr: 'سائقو كور وبرو — مساحة أكبر',
    eligible_tiers: new Set(['comfort', 'premium']),
    min_driver_rating: 4.6,
    min_vehicle_rating: 4.2,
    min_acceptance_rate: 0.75,
    eta_sla_min: 12,
  },
};

const PRODUCT_MIN_TIER_RANK: Record<RideProduct, number> = { normal: 0, comfort: 1 };

export const DEFAULT_CONFIG = {
  max_radius_km:            8,
  radius_expansion_factor:  1.5,
  max_radius_expansions:    2,
  max_candidates:           40,
  speed_kmph:               24,
  eta_cap_min:              15,
  shift_max_hours:          10,
  max_shift_hours:          14,
  fairness_cap:             10,
  idle_cap_min:             30,
  consec_decline_threshold: 3,
  consec_decline_penalty:   0.60,
  tier_bonus:               { economy: 0.0, comfort: 0.15, premium: 0.30 },
  w_tier:                   0.8,
  upgrade_bonus_per_level:  0.05,
  soft_cap:                 { economy: 6, comfort: 9, premium: 12 },
  soft_cap_penalty:         0.40,
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
```

**Step 2: Add pure math helpers**

Append to the same file:

```typescript
// ── Pure math helpers ──────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dlat = (lat2 - lat1) * Math.PI / 180;
  const dlon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dlat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dlon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dlng = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dlng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dlng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function estimateEtaMin(distKm: number, trafficMult: number, speedKmph: number): number {
  return (distKm / Math.max(speedKmph, 1e-6)) * 60.0 * Math.max(trafficMult, 0.7);
}
```

**Step 3: Add driver-state helpers**

Append to the same file:

```typescript
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
  const offered = driver.offered ?? 0;
  const accepted = driver.accepted ?? 0;
  if (offered < 10) return 0.80;
  return clamp(accepted / offered, 0, 1);
}

function computeCompletionScore(driver: AlgoDriver): number {
  const accepted = driver.accepted ?? 0;
  const canceled = driver.canceled ?? 0;
  if (accepted < 5) return 0.95;
  return clamp(1.0 - canceled / accepted, 0, 1);
}

function computeRatingScore(driver: AlgoDriver): number {
  const dr = clamp(driver.rating ?? 4.0, 1, 5);
  const vr = clamp(driver.vehicle_rating ?? 4.0, 1, 5);
  return (0.70 * dr + 0.30 * vr - 1.0) / 4.0;
}

function computeShiftFatigue(driver: AlgoDriver, cfg: typeof DEFAULT_CONFIG): number {
  const hours = driver.shift_hours ?? 0;
  const soft = cfg.shift_max_hours;
  const hard = cfg.max_shift_hours;
  if (hours <= soft) return 0;
  return clamp((hours - soft) / Math.max(hard - soft, 1e-6), 0, 1);
}

function computeHeadingBonus(driver: AlgoDriver, pickupLat: number, pickupLng: number): number {
  const speed = driver.speed_kmph_now ?? 0;
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
  const declines = driver.consecutive_declines ?? 0;
  const threshold = cfg.consec_decline_threshold;
  const maxPen = cfg.consec_decline_penalty;
  if (declines < threshold) return 0;
  const excess = declines - threshold + 1;
  return clamp(maxPen * excess / 3.0, 0, maxPen);
}

function effectiveTierBonus(driverTier: string, tripsToday: number, cfg: typeof DEFAULT_CONFIG): number {
  const tierBonus = cfg.tier_bonus as Record<string, number>;
  const softCap = cfg.soft_cap as Record<string, number>;
  const penalty = cfg.soft_cap_penalty;
  const cap = softCap[driverTier] ?? 999;
  const above = tripsToday >= cap;
  if (!above) return tierBonus[driverTier] ?? 0;
  if (driverTier === 'premium') return (tierBonus['comfort'] ?? 0.15) - penalty;
  if (driverTier === 'comfort') return (tierBonus['economy'] ?? 0) - penalty;
  return (tierBonus['economy'] ?? 0) - penalty * 1.5;
}

function tierUpgradeBonus(product: RideProduct, driverTier: string, perLevel: number): number {
  const minRank = PRODUCT_MIN_TIER_RANK[product] ?? 0;
  const delta = (TIER_RANK[driverTier] ?? 0) - minRank;
  return perLevel * Math.max(delta, 0);
}
```

**Step 4: Add the main matchRequest function**

Append to the same file:

```typescript
// ── Main matching function ─────────────────────────────────────────────────

export function matchRequest(
  request: MatchRequest,
  drivers: AlgoDriver[],
  config: AlgoConfig = {},
): MatchResult {
  const cfg = { ...DEFAULT_CONFIG, ...config } as typeof DEFAULT_CONFIG;

  const reqProduct = request.product;
  const prodMeta = PRODUCT_META[reqProduct];

  const pickupLat = request.pickup_lat;
  const pickupLng = request.pickup_lng;
  const dropoffLat = request.dropoff_lat;
  const dropoffLng = request.dropoff_lng;
  const paxCount = request.pax_count ?? 1;
  const traffic = request.traffic_mult ?? 1.0;
  const blacklist = new Set(request.blacklisted_drivers ?? []);

  const reqWait = request.max_wait_min ?? prodMeta.eta_sla_min;
  const maxWait = Math.min(reqWait, prodMeta.eta_sla_min);
  const demandLat = request.demand_lat ?? pickupLat;
  const demandLng = request.demand_lng ?? pickupLng;

  let radius = cfg.max_radius_km;
  const expFactor = cfg.radius_expansion_factor;
  const maxExps = cfg.max_radius_expansions;

  let feasible: Array<[number, AlgoDriver]> = [];
  let attempt = 0;

  while (attempt <= maxExps) {
    feasible = [];

    for (const d of drivers) {
      if (!d.available) continue;
      if ((d.status ?? 'idle') === 'on_trip' || d.status === 'offline') continue;
      if (blacklist.has(d.id)) continue;
      if (!canServeProduct(reqProduct, d)) continue;

      const offered = d.offered ?? 0;
      const accepted = d.accepted ?? 0;
      if (offered >= 10 && (accepted / offered) < prodMeta.min_acceptance_rate) continue;
      if ((d.rating ?? 4.0) < prodMeta.min_driver_rating) continue;
      if ((d.vehicle_rating ?? 4.0) < prodMeta.min_vehicle_rating) continue;
      if ((d.vehicle_seats ?? 4) < paxCount) continue;
      if ((d.shift_hours ?? 0) > cfg.max_shift_hours) continue;

      const distKm = haversineKm(pickupLat, pickupLng, d.lat, d.lng);
      if (distKm > radius) continue;

      feasible.push([distKm, d]);
    }

    if (feasible.length > 0) break;
    if (attempt === maxExps) break;
    radius *= expFactor;
    attempt++;
  }

  if (feasible.length === 0) {
    return {
      best_id: null,
      ranked_ids: [],
      debug: { reason: 'no_feasible_drivers', product: reqProduct, radius_km: radius, attempts: attempt + 1 },
    };
  }

  feasible.sort((a, b) => a[0] - b[0]);
  const shortlist = feasible.slice(0, cfg.max_candidates);

  const ranked: Array<[number, string | number]> = [];
  const debugRows: MatchDebugRow[] = [];

  for (const [distKm, d] of shortlist) {
    const etaMin = estimateEtaMin(distKm, traffic, cfg.speed_kmph);
    if (etaMin > maxWait) continue;

    const etaNorm = clamp(etaMin / cfg.eta_cap_min, 0, 2);
    const arScore = computeAcceptanceScore(d);
    const completion = computeCompletionScore(d);
    const onTime = d.on_time_rate ?? 0.85;
    const ratingScore = computeRatingScore(d);
    const fatigue = computeShiftFatigue(d, cfg);
    const headingBon = computeHeadingBonus(d, pickupLat, pickupLng);
    const deadPen = computeDeadMilePenalty(d, dropoffLat, dropoffLng, demandLat, demandLng);
    const declinePen = computeDeclinePenalty(d, cfg);
    const assigned = d.assigned ?? 0;
    const fairnessPen = clamp(assigned / Math.max(cfg.fairness_cap, 1e-6), 0, 2);
    const idleMin = d.idle_min ?? 0;
    const idleBonus = clamp(idleMin / cfg.idle_cap_min, 0, 1);

    const dTier = driverMaxTier(d);
    const tripsToday = d.trips_today ?? 0;
    const tBonus = effectiveTierBonus(dTier, tripsToday, cfg);
    const upgrade = tierUpgradeBonus(reqProduct, dTier, cfg.upgrade_bonus_per_level);
    const tierSignal = tBonus + upgrade;

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
      driver_id: d.id,
      driver_tier: dTier,
      wasel_tier: TIER_META[dTier]?.name ?? dTier,
      req_product: reqProduct,
      dist_km: Math.round(distKm * 1000) / 1000,
      eta_min: Math.round(etaMin * 100) / 100,
      acceptance_rate: Math.round(arScore * 1000) / 1000,
      score: Math.round(score * 10000) / 10000,
      _contrib: {
        ETA:        -cfg.w_eta        * etaNorm,
        Acceptance: +cfg.w_acceptance * arScore,
        Rating:     +cfg.w_rating     * ratingScore,
        Tier:       +cfg.w_tier       * tierSignal,
      },
    });
  }

  if (ranked.length === 0) {
    return {
      best_id: null,
      ranked_ids: [],
      debug: { reason: 'all_candidates_failed_sla', product: reqProduct, radius_km: radius, attempts: attempt + 1 },
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
        w_eta: cfg.w_eta, w_acceptance: cfg.w_acceptance,
        w_rating: cfg.w_rating, w_tier: cfg.w_tier,
      },
    },
  };
}
```

---

### Task 2: Update mockData.ts — 2 ride products + enriched drivers

**Files:**
- Modify: `src/app/data/mockData.ts`

**Step 1: Update RideTier interface and RIDE_TIERS**

Replace the `RideTier` interface and `RIDE_TIERS` export:

```typescript
export interface RideTier {
  id: 'normal' | 'comfort';
  label: string;
  labelAr: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  capacity: number;
  etaMin: number;
  etaMax: number;
}

export const RIDE_TIERS: RideTier[] = [
  {
    id: 'normal',
    label: 'Normal',
    labelAr: 'عادي',
    baseFare: 1.5,
    perKm: 0.35,
    perMin: 0.05,
    capacity: 4,
    etaMin: 2,
    etaMax: 5,
  },
  {
    id: 'comfort',
    label: 'Comfort',
    labelAr: 'مريح',
    baseFare: 2.0,
    perKm: 0.45,
    perMin: 0.07,
    capacity: 4,
    etaMin: 4,
    etaMax: 8,
  },
];
```

**Step 2: Update Driver interface to match AlgoDriver**

Replace the `Driver` interface:

```typescript
export interface Driver {
  id: string;
  nameEn: string;
  nameAr: string;
  rating: number;
  vehicle_rating: number;
  totalTrips: number;
  carModel: string;
  carColor: string;
  licensePlate: string;
  phone: string;
  photo: string;
  // Algorithm fields
  tiers: string[];          // subscription tier(s) — matches AlgoDriver
  lat: number;
  lng: number;
  available: boolean;
  status: 'idle' | 'returning' | 'on_trip' | 'offline';
  etaMinutes: number;
  offered: number;
  accepted: number;
  canceled: number;
  on_time_rate: number;
  trips_today: number;
  shift_hours: number;
  idle_min: number;
  consecutive_declines: number;
  vehicle_seats: number;
  assigned: number;
  speed_kmph_now: number;
  heading_deg: number;
}
```

**Step 3: Replace DRIVERS array with enriched data**

```typescript
export const DRIVERS: Driver[] = [
  {
    id: 'd1',
    nameEn: 'Ahmad Al-Rashid',
    nameAr: 'أحمد الراشد',
    rating: 4.8,
    vehicle_rating: 4.5,
    totalTrips: 1247,
    carModel: 'Toyota Camry 2022',
    carColor: 'White',
    licensePlate: '12-A-3456',
    phone: '+962791234567',
    photo: 'https://images.unsplash.com/photo-1658134424346-89203c9991c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    tiers: ['economy'],
    lat: 31.963,
    lng: 35.918,
    available: true,
    status: 'idle',
    etaMinutes: 3,
    offered: 210,
    accepted: 189,
    canceled: 4,
    on_time_rate: 0.94,
    trips_today: 4,
    shift_hours: 4.5,
    idle_min: 18,
    consecutive_declines: 0,
    vehicle_seats: 4,
    assigned: 3,
    speed_kmph_now: 0,
    heading_deg: 0,
  },
  {
    id: 'd2',
    nameEn: 'Mohammad Haddad',
    nameAr: 'محمد حداد',
    rating: 4.9,
    vehicle_rating: 4.7,
    totalTrips: 892,
    carModel: 'Honda Accord 2023',
    carColor: 'Silver',
    licensePlate: '78-B-1234',
    phone: '+962797654321',
    photo: 'https://images.unsplash.com/photo-1658134424346-89203c9991c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    tiers: ['comfort'],
    lat: 31.958,
    lng: 35.905,
    available: true,
    status: 'idle',
    etaMinutes: 5,
    offered: 165,
    accepted: 155,
    canceled: 2,
    on_time_rate: 0.97,
    trips_today: 7,
    shift_hours: 6.0,
    idle_min: 5,
    consecutive_declines: 0,
    vehicle_seats: 4,
    assigned: 5,
    speed_kmph_now: 0,
    heading_deg: 0,
  },
  {
    id: 'd3',
    nameEn: 'Khalid Al-Mansouri',
    nameAr: 'خالد المنصوري',
    rating: 5.0,
    vehicle_rating: 5.0,
    totalTrips: 2103,
    carModel: 'Mercedes E-Class 2024',
    carColor: 'Black',
    licensePlate: '55-C-7890',
    phone: '+962799876543',
    photo: 'https://images.unsplash.com/photo-1658134424346-89203c9991c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    tiers: ['premium'],
    lat: 31.971,
    lng: 35.892,
    available: true,
    status: 'idle',
    etaMinutes: 7,
    offered: 320,
    accepted: 310,
    canceled: 3,
    on_time_rate: 0.99,
    trips_today: 9,
    shift_hours: 7.5,
    idle_min: 2,
    consecutive_declines: 0,
    vehicle_seats: 4,
    assigned: 8,
    speed_kmph_now: 12,
    heading_deg: 45,
  },
];
```

---

### Task 3: Update translations.ts — replace premium with normal

**Files:**
- Modify: `src/app/data/translations.ts`

**Step 1: Update TranslationKey union type**

Replace `| 'economy' | 'comfort' | 'premium'` with `| 'normal' | 'economy' | 'comfort'`

Replace `| 'economyDesc' | 'comfortDesc' | 'premiumDesc'` with `| 'normalDesc' | 'comfortDesc'`

**Step 2: Update English translations**

- Add `normal: 'Normal'`
- Change `economy: 'Economy'` → keep as-is (used in ride history)
- Remove `premium: 'Premium'` and `premiumDesc: '...'`
- Add `normalDesc: 'Affordable everyday rides — all drivers'`
- Change `comfortDesc: 'Core & Pro drivers — extra comfort'`

**Step 3: Update Arabic translations**

- Add `normal: 'عادي'`
- Remove `premium: 'بريميوم'` and `premiumDesc`
- Add `normalDesc: 'رحلات يومية ميسورة — جميع السائقين'`
- Change `comfortDesc: 'سائقو كور وبرو — راحة إضافية'`

---

### Task 4: Refactor HomeScreen.tsx — 2 products + algorithm wiring

**Files:**
- Modify: `src/app/screens/HomeScreen.tsx`

**Step 1: Update imports**

Add import at top:
```typescript
import { matchRequest } from '../algorithm/matching';
import type { AlgoDriver } from '../algorithm/matching';
```

**Step 2: Change selectedTierId type and default**

```typescript
// Before:
const [selectedTierId, setSelectedTierId] = useState<'economy' | 'comfort' | 'premium'>('economy');
// After:
const [selectedTierId, setSelectedTierId] = useState<'normal' | 'comfort'>('normal');
```

**Step 3: Update tierIcons and tierColors**

```typescript
// Before: 3 entries
const tierIcons = { economy: <Car size={20} />, comfort: <Zap size={20} />, premium: <Crown size={20} /> };
const tierColors = { economy: '#4B7BEC', comfort: '#26C6DA', premium: '#D4A843' };

// After: 2 entries
const tierIcons: Record<'normal' | 'comfort', React.ReactNode> = {
  normal:  <Car size={20} />,
  comfort: <Zap size={20} />,
};
const tierColors: Record<'normal' | 'comfort', string> = {
  normal:  '#4B7BEC',
  comfort: '#26C6DA',
};
```

**Step 4: Wire the algorithm in handleConfirmRide**

```typescript
const handleConfirmRide = () => {
  setStage('finding_driver');

  // Build algorithm-compatible driver list
  const algoDrivers: AlgoDriver[] = DRIVERS.map(d => ({
    ...d,
    // AlgoDriver expects lat/lng from Driver's lat/lng fields
  }));

  const result = matchRequest(
    {
      pickup_lat: pickupLocation[0],
      pickup_lng: pickupLocation[1],
      product: selectedTierId,
      dropoff_lat: destinationPlace?.coords[0],
      dropoff_lng: destinationPlace?.coords[1],
    },
    algoDrivers,
    {},
  );

  const matched = result.best_id
    ? DRIVERS.find(d => d.id === result.best_id) ?? DRIVERS[0]
    : DRIVERS[0];

  setAssignedDriver(matched);
  setTimeout(() => setStage('driver_matched'), 3000);
};
```

**Step 5: Update tier label rendering in select_tier sheet**

Replace `{t(tier.id)}` with `{tier.label}` (or `{isRTL ? tier.labelAr : tier.label}`)

Replace `{t(tier.id + 'Desc' as any)}` with the desc from `PRODUCT_META[tier.id as RideProduct]?.description`

**Step 6: Remove Crown import (no longer needed)**

Remove `Crown` from the lucide-react import line.

---

### Task 5: Complete SettingsScreen.tsx — Notifications + BecomeDriver

**Files:**
- Modify: `src/app/screens/SettingsScreen.tsx`

**Step 1: Add new view types**

```typescript
// Before:
type SettingsView = 'main' | 'profile' | 'places' | 'history' | 'payment' | 'safety' | 'about';
// After:
type SettingsView = 'main' | 'profile' | 'places' | 'history' | 'payment' | 'safety' | 'about' | 'notifications' | 'becomeDriver';
```

**Step 2: Update the menu items to navigate to the real views**

```typescript
// Change these two items:
{ icon: <Bell .../>, label: t('notifications'), bg: '#EFF6FF', view: 'notifications' as SettingsView },
{ icon: <Car  .../>, label: t('becomeDriver'),  bg: '#FFF8E8', view: 'becomeDriver'  as SettingsView },
```

**Step 3: Add Notifications sub-screen**

Add after the ABOUT view block, inside `<AnimatePresence>`:

```tsx
{view === 'notifications' && (
  <motion.div
    key="notifications"
    variants={slideIn}
    initial="hidden"
    animate="visible"
    exit="exit"
    className="absolute inset-0 flex flex-col"
  >
    <SubHeader title={t('notifications')} onBack={() => setView('main')} />
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24" style={{ scrollbarWidth: 'none' }}>
      <NotificationToggles lang={lang} isRTL={isRTL} fontFamily={fontFamily} />
    </div>
  </motion.div>
)}
```

The `NotificationToggles` component (inline in the same file):

```tsx
function NotificationToggles({ lang, isRTL, fontFamily }: { lang: string; isRTL: boolean; fontFamily: string }) {
  const [rideUpdates,  setRideUpdates]  = useState(true);
  const [promotions,   setPromotions]   = useState(true);
  const [newsAlerts,   setNewsAlerts]   = useState(false);
  const [driverAlerts, setDriverAlerts] = useState(true);

  const items = [
    {
      icon: '🚗',
      label: lang === 'ar' ? 'تحديثات الرحلة' : 'Ride Updates',
      desc:  lang === 'ar' ? 'الاستلام والوصول وحالة الرحلة' : 'Pickup, arrival, and trip status',
      value: rideUpdates,
      set:   setRideUpdates,
    },
    {
      icon: '🎁',
      label: lang === 'ar' ? 'العروض والخصومات' : 'Promotions & Offers',
      desc:  lang === 'ar' ? 'كودات الخصم وعروض واصل' : 'Promo codes and Wasel deals',
      value: promotions,
      set:   setPromotions,
    },
    {
      icon: '📰',
      label: lang === 'ar' ? 'أخبار واصل' : 'Wasel News',
      desc:  lang === 'ar' ? 'آخر المستجدات والمقالات' : 'Latest updates and articles',
      value: newsAlerts,
      set:   setNewsAlerts,
    },
    {
      icon: '⭐',
      label: lang === 'ar' ? 'تذكيرات التقييم' : 'Rating Reminders',
      desc:  lang === 'ar' ? 'تذكير لتقييم رحلتك' : 'Remind you to rate your ride',
      value: driverAlerts,
      set:   setDriverAlerts,
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: i < items.length - 1 ? '1px solid #F5F5F5' : 'none', direction: isRTL ? 'rtl' : 'ltr' }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
          <div className="flex-1">
            <div style={{ fontFamily, fontWeight: 600, fontSize: 14, color: '#1B3A5C' }}>{item.label}</div>
            <div style={{ fontFamily, fontSize: 12, color: '#888' }}>{item.desc}</div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={() => item.set(!item.value)}
            className="rounded-full transition-all flex-shrink-0"
            style={{
              width: 44, height: 24,
              background: item.value ? '#1B3A5C' : '#E0E0E0',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: item.value ? 22 : 2,
                width: 20, height: 20,
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Add BecomeDriver sub-screen**

```tsx
{view === 'becomeDriver' && (
  <motion.div
    key="becomeDriver"
    variants={slideIn}
    initial="hidden"
    animate="visible"
    exit="exit"
    className="absolute inset-0 flex flex-col"
  >
    <SubHeader title={t('becomeDriver')} onBack={() => setView('main')} />
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24" style={{ scrollbarWidth: 'none' }}>
      {/* Hero */}
      <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: 'linear-gradient(135deg, #1B3A5C, #2E5A8A)' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
        <div style={{ fontFamily, fontWeight: 800, fontSize: 18, color: '#D4A843', marginBottom: 4 }}>
          {lang === 'ar' ? 'احتفظ بـ 100% من أرباحك' : 'Keep 100% of Your Earnings'}
        </div>
        <div style={{ fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
          {lang === 'ar'
            ? 'ادفع اشتراكاً شهرياً ثابتاً فقط — لا عمولة على أي رحلة'
            : 'Pay a flat monthly subscription only — zero commission per ride'}
        </div>
      </div>

      {/* Tier comparison */}
      {[
        {
          name: lang === 'ar' ? 'ستارتر' : 'Starter',
          price: 'JD 20/mo',
          cap: lang === 'ar' ? '٦ رحلات/يوم' : '6 rides/day',
          products: lang === 'ar' ? 'رحلات عادية فقط' : 'Normal rides only',
          color: '#4B7BEC',
          icon: '🚗',
        },
        {
          name: lang === 'ar' ? 'كور' : 'Core',
          price: 'JD 35/mo',
          cap: lang === 'ar' ? '٩ رحلات/يوم' : '9 rides/day',
          products: lang === 'ar' ? 'عادي + مريح' : 'Normal + Comfort',
          color: '#26C6DA',
          icon: '⚡',
        },
        {
          name: lang === 'ar' ? 'برو' : 'Pro',
          price: 'JD 55/mo',
          cap: lang === 'ar' ? '١٢ رحلة/يوم' : '12 rides/day',
          products: lang === 'ar' ? 'عادي + مريح (أولوية)' : 'Normal + Comfort (priority)',
          color: '#D4A843',
          icon: '👑',
          highlight: true,
        },
      ].map((tier, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 mb-3 flex items-start gap-3"
          style={{
            background: tier.highlight ? '#FFF8E8' : 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: tier.highlight ? '2px solid #D4A843' : '2px solid transparent',
          }}
        >
          <div className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ width: 44, height: 44, background: tier.color + '22', fontSize: 20 }}>
            {tier.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div style={{ fontFamily, fontWeight: 700, fontSize: 15, color: '#1B3A5C' }}>{tier.name}</div>
              <div style={{ fontFamily, fontWeight: 800, fontSize: 15, color: tier.color }}>{tier.price}</div>
            </div>
            <div style={{ fontFamily, fontSize: 12, color: '#888', marginBottom: 2 }}>{tier.cap}</div>
            <div style={{ fontFamily, fontSize: 12, color: '#666' }}>{tier.products}</div>
          </div>
        </div>
      ))}

      <button
        className="w-full rounded-2xl py-4"
        style={{ background: '#D4A843', color: 'white', fontFamily, fontWeight: 700, fontSize: 16 }}
      >
        {lang === 'ar' ? 'ابدأ كسائق' : 'Start as a Driver'}
      </button>

      <div className="text-center mt-3">
        <div style={{ fontFamily, fontSize: 12, color: '#888' }}>
          {lang === 'ar' ? '✓ لا رسوم تسجيل · ✓ دفع بالدينار · ✓ دعم 24/7' : '✓ No registration fee · ✓ Pay in JD · ✓ 24/7 support'}
        </div>
      </div>
    </div>
  </motion.div>
)}
```

Add `useState` import for `NotificationToggles` if not already present.

---

### Task 6: Final type-check and cleanup

**Files:**
- Modify: `src/app/screens/HomeScreen.tsx` (remove unused `Crown` import)
- Modify: `src/app/data/translations.ts` (verify no `premium` key references remain in screens)

**Step 1: Check SettingsScreen ride history**

The ride history in SettingsScreen uses `tier: 'economy' | 'comfort'` for display — keep those entries using `economy` and `comfort` string literals directly (not `normal`) since they represent historical ride tier labels, not algorithm product names. No change needed there.

**Step 2: Verify `t('economy')` key**

The translation key `economy: 'Economy'` stays in translations for use in ride history display. The new `normal` key is what HomeScreen ride product selector uses.

**Step 3: Start the dev server and visually verify**

```bash
cd "Ride-hailing app for MENA"
npm run dev
```

Open http://localhost:5173 and check:
- [ ] Home screen shows 2 ride products (Normal / Comfort)
- [ ] Booking flow runs algorithm, selects best matching driver
- [ ] Settings → Notifications shows toggles
- [ ] Settings → Become a Driver shows tier comparison
- [ ] EN/AR toggle works across all updated screens
- [ ] No TypeScript errors in console

---
