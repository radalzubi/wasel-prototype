"""
matching.py — Wasel Best Matching Protocol v3.0
================================================
Uber-style dispatch (ETA-first) + Wasel tiered subscription program.

RIDE PRODUCTS  (rider-facing options)
──────────────────────────────────────
  "normal"   Economy ride — all drivers eligible, fastest pickup
             Min rating 4.0 · Min vehicle rating 3.5 · ETA SLA 15 min

  "comfort"  Comfort ride — Core + Pro drivers only, premium experience
             Min rating 4.6 · Min vehicle rating 4.2 · ETA SLA 12 min

DRIVER TIERS  (Wasel subscription)
────────────────────────────────────
  economy  → Starter  JD 20/mo  cap 6/day   Normal rides only
  comfort  → Core     JD 35/mo  cap 9/day   Normal + Comfort
  premium  → Pro      JD 55/mo  cap 12/day  Normal + Comfort  (first priority)

HARD FILTERS  (must pass ALL — eliminates ineligible drivers)
──────────────────────────────────────────────────────────────
   1. available = True  AND  status ∈ {idle, returning}
   2. Not on rider's blocked-driver list
   3. Product eligibility:  normal → all tiers  |  comfort → Core + Pro only
   4. Acceptance rate ≥ product minimum  (applied only if ≥ 10 offers sent)
   5. Driver rating ≥ product floor
   6. Vehicle condition rating ≥ product floor
   7. Vehicle capacity ≥ passenger count
   8. Distance ≤ search radius  (with automatic expansion fallback)
   9. Shift hours ≤ max_shift_hours  (fatigue safety hard limit)
  10. ETA ≤ product SLA  (or request override, whichever is stricter)

SOFT SCORING  (Uber-style: ETA dominant, acceptance rate second)
────────────────────────────────────────────────────────────────
  − w_eta          × eta_norm          PRIMARY — closest driver wins
  + w_acceptance   × ar_score          Acceptance rate  (Uber's #2 factor)
  + w_rating       × rating_score      Driver + vehicle quality
  + w_completion   × completion        Trip completion rate  (1 − cancel rate)
  + w_on_time      × on_time           On-time arrival rate
  + w_tier         × tier_signal       Wasel tier preference + soft-cap drop
  + w_idle         × idle_bonus        Reward patient waiting drivers
  − w_fairness     × fairness_pen      Prevent dispatch monopolisation
  − w_consec_decl  × decline_pen       Penalise consecutive declines
  − w_shift        × shift_fatigue     Long-shift penalty
  + w_heading      × heading_bonus     Moving toward pickup = bonus
  − w_dead_mile    × dead_mile_pen     Post-dropoff stranding penalty

FALLBACK
────────
  If no candidates found after all hard filters, expand search radius up to
  max_radius_expansions times, then admit the best available match.
"""

import math
from typing import Any, Dict, List, Optional, Set, Tuple

# ── Tier constants ─────────────────────────────────────────────────────────────
TIER_RANK: Dict[str, int] = {"economy": 0, "comfort": 1, "premium": 2}

TIER_META: Dict[str, Any] = {
    "economy": {
        "name":         "Starter",
        "driver_label": "Normal Driver",
        "fee_jod":      20,
        "daily_soft_cap": 6,
    },
    "comfort": {
        "name":         "Core",
        "driver_label": "Comfort Driver",
        "fee_jod":      35,
        "daily_soft_cap": 9,
    },
    "premium": {
        "name":         "Pro",
        "driver_label": "Comfort Driver",
        "fee_jod":      55,
        "daily_soft_cap": 12,
    },
}

# ── Ride product definitions ───────────────────────────────────────────────────
PRODUCT_META: Dict[str, Any] = {
    "normal": {
        "label":               "Normal",
        "eligible_tiers":      {"economy", "comfort", "premium"},
        "min_driver_rating":   4.0,
        "min_vehicle_rating":  3.5,
        "min_acceptance_rate": 0.70,
        "eta_sla_min":         15,
        "description":         "Economy ride — all drivers eligible",
    },
    "comfort": {
        "label":               "Comfort",
        "eligible_tiers":      {"comfort", "premium"},
        "min_driver_rating":   4.6,
        "min_vehicle_rating":  4.2,
        "min_acceptance_rate": 0.75,
        "eta_sla_min":         12,
        "description":         "Comfort ride — Core & Pro drivers only",
    },
}

# Minimum driver tier rank required per product (used by upgrade bonus)
_PRODUCT_MIN_TIER_RANK: Dict[str, int] = {"normal": 0, "comfort": 1}

# ── Default configuration ──────────────────────────────────────────────────────
DEFAULT_CONFIG: Dict[str, Any] = {
    # ── Geography ─────────────────────────────────────────────────────────────
    "max_radius_km":            8,
    "radius_expansion_factor":  1.5,   # multiply radius on each fallback
    "max_radius_expansions":    2,     # max number of fallback expansions
    "max_candidates":           40,    # shortlist size after distance sort

    # ── ETA model (Amman blended avg speed) ───────────────────────────────────
    "speed_kmph":               24,
    "eta_cap_min":              15,    # normalisation cap — tighter = ETA dominates more

    # ── Fatigue / shift limits ─────────────────────────────────────────────────
    "shift_max_hours":          10,    # soft limit — penalty starts here
    "max_shift_hours":          14,    # hard limit — drivers above this are filtered

    # ── Fairness / idle ────────────────────────────────────────────────────────
    "fairness_cap":             10,    # sessions rides → max fairness penalty
    "idle_cap_min":             30,    # idle minutes → max idle bonus

    # ── Consecutive decline penalty (Uber-style) ───────────────────────────────
    "consec_decline_threshold": 3,     # >= this many → penalty kicks in
    "consec_decline_penalty":   0.60,  # maximum score penalty

    # ── Wasel tier preference (layered on top of ETA-first scoring) ────────────
    "tier_bonus":               {"economy": 0.0, "comfort": 0.15, "premium": 0.30},
    "w_tier":                   0.8,
    "upgrade_bonus_per_level":  0.05,

    # ── Wasel soft-cap (trips/day) ─────────────────────────────────────────────
    "soft_cap":                 {"economy": 6, "comfort": 9, "premium": 12},
    "soft_cap_penalty":         0.40,  # priority drop when over cap

    # ── Score weights ──────────────────────────────────────────────────────────
    # ETA is the primary factor — mirrors Uber's ETA-first dispatch philosophy
    "w_eta":          2.0,   # PRIMARY — dominant factor, like Uber
    # Acceptance rate is Uber's critical 2nd factor
    "w_acceptance":   1.5,
    # Quality signals
    "w_rating":       0.8,   # driver + vehicle quality composite
    "w_completion":   0.6,   # trip completion rate (1 − cancel rate)
    "w_on_time":      0.4,   # on-time arrival punctuality
    # Wasel tier preference
    "w_tier":         0.8,
    # Operational signals
    "w_idle":         0.3,   # idle time bonus
    "w_fairness":     0.3,   # fairness penalty
    "w_consec_decl":  0.5,   # consecutive decline penalty
    "w_shift":        0.4,   # shift fatigue penalty
    "w_heading":      0.2,   # directional heading bonus
    "w_dead_mile":    0.15,  # post-dropoff stranding penalty
}


# ─────────────────────────────────────────────────────────────────────────────
# Pure math helpers
# ─────────────────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compass bearing (0–360) from point 1 → point 2."""
    dlng = math.radians(lon2 - lon1)
    y    = math.sin(dlng) * math.cos(math.radians(lat2))
    x    = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2))
            - math.sin(math.radians(lat1)) * math.cos(math.radians(lat2))
            * math.cos(dlng))
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def estimate_eta_min(dist_km: float, traffic_mult: float, speed_kmph: float) -> float:
    return (dist_km / max(speed_kmph, 1e-6)) * 60.0 * max(traffic_mult, 0.7)


# ─────────────────────────────────────────────────────────────────────────────
# Driver-state helpers
# ─────────────────────────────────────────────────────────────────────────────

def driver_max_tier(driver: Dict[str, Any]) -> str:
    tiers = driver.get("tiers", [])
    if not tiers:
        return "economy"
    return max(tiers, key=lambda t: TIER_RANK.get(t, 0))


def can_serve_product(product: str, driver: Dict[str, Any]) -> bool:
    """
    Check product eligibility:
      normal  → all driver tiers eligible
      comfort → Core (comfort) + Pro (premium) only — Starter excluded
    """
    eligible = PRODUCT_META.get(product, PRODUCT_META["normal"])["eligible_tiers"]
    return driver_max_tier(driver) in eligible


def compute_acceptance_score(driver: Dict[str, Any]) -> float:
    """
    Acceptance rate ∈ [0, 1].
    Uber weights this heavily — it reflects how reliably a driver takes offers.
    New drivers (< 10 offers) receive a neutral prior of 0.80.
    """
    offered  = driver.get("offered",  0)
    accepted = driver.get("accepted", 0)
    if offered < 10:
        return 0.80   # neutral prior for new / low-history drivers
    return clamp(accepted / offered, 0.0, 1.0)


def compute_completion_score(driver: Dict[str, Any]) -> float:
    """
    Trip completion rate ∈ [0, 1]  =  1 − cancel_rate.
    New drivers (< 5 accepted trips) receive a prior of 0.95.
    """
    accepted = driver.get("accepted", 0)
    canceled = driver.get("canceled", 0)
    if accepted < 5:
        return 0.95
    return clamp(1.0 - canceled / accepted, 0.0, 1.0)


def compute_rating_score(driver: Dict[str, Any]) -> float:
    """
    Normalised quality score ∈ [0, 1].
    70% driver rating + 30% vehicle condition rating.
    Both on 1–5 scale, mapped linearly to [0, 1].
    """
    dr = clamp(driver.get("rating",         4.0), 1.0, 5.0)
    vr = clamp(driver.get("vehicle_rating", 4.0), 1.0, 5.0)
    return (0.70 * dr + 0.30 * vr - 1.0) / 4.0


def compute_shift_fatigue(driver: Dict[str, Any], cfg: Dict[str, Any]) -> float:
    """
    Fatigue penalty ∈ [0, 1].
    Zero below the soft limit, ramps linearly to 1 at the hard limit.
    """
    hours = driver.get("shift_hours", 0.0)
    soft  = cfg.get("shift_max_hours", 10)
    hard  = cfg.get("max_shift_hours",  14)
    if hours <= soft:
        return 0.0
    return clamp((hours - soft) / max(hard - soft, 1e-6), 0.0, 1.0)


def compute_heading_bonus(driver: Dict[str, Any],
                          pickup_lat: float, pickup_lng: float) -> float:
    """
    Heading bonus ∈ [0, 1].
    Rewards drivers who are already moving toward the pickup point.
    Only meaningful when the driver is moving (speed ≥ 5 km/h).
    """
    speed   = driver.get("speed_kmph_now", 0.0)
    heading = driver.get("heading_deg",    None)
    if speed < 5 or heading is None:
        return 0.0
    target = bearing_deg(driver["lat"], driver["lng"], pickup_lat, pickup_lng)
    delta  = abs(heading - target) % 360
    if delta > 180:
        delta = 360 - delta
    return clamp(math.cos(math.radians(delta)), 0.0, 1.0)


def compute_dead_mile_penalty(driver: Dict[str, Any],
                              dropoff_lat: Optional[float],
                              dropoff_lng: Optional[float],
                              demand_lat: float, demand_lng: float,
                              max_dead_km: float = 15.0) -> float:
    """
    Dead-mileage penalty ∈ [0, 1].
    Penalises drivers whose dropoff location strands them far from the demand centre.
    Skipped if dropoff is unknown.
    """
    if dropoff_lat is None or dropoff_lng is None:
        return 0.0
    dist = haversine_km(dropoff_lat, dropoff_lng, demand_lat, demand_lng)
    return clamp(dist / max_dead_km, 0.0, 1.0)


def compute_decline_penalty(driver: Dict[str, Any], cfg: Dict[str, Any]) -> float:
    """
    Consecutive decline penalty ∈ [0, max_pen].
    Uber-style: drivers who repeatedly decline offers are deprioritised.
    No penalty below the threshold; ramps up with each additional decline.
    """
    declines  = driver.get("consecutive_declines", 0)
    threshold = cfg.get("consec_decline_threshold", 3)
    max_pen   = cfg.get("consec_decline_penalty",   0.60)
    if declines < threshold:
        return 0.0
    excess = declines - threshold + 1
    return clamp(max_pen * excess / 3.0, 0.0, max_pen)


def effective_tier_bonus(driver_tier: str, trips_today: int,
                         cfg: Dict[str, Any]) -> float:
    """
    Wasel soft-cap priority-drop logic:
      Below cap   → full tier bonus
      Pro above   → drops to Core-level bonus − penalty
      Core above  → drops to Starter-level bonus − penalty
      Starter above → goes negative (further deprioritised)
    """
    tier_bonus = cfg["tier_bonus"]
    soft_cap   = cfg["soft_cap"]
    penalty    = cfg["soft_cap_penalty"]

    cap   = soft_cap.get(driver_tier, 999)
    above = trips_today >= cap

    if not above:
        return tier_bonus.get(driver_tier, 0.0)

    if driver_tier == "premium":
        return tier_bonus.get("comfort", 0.15) - penalty
    elif driver_tier == "comfort":
        return tier_bonus.get("economy", 0.0)  - penalty
    else:
        return tier_bonus.get("economy", 0.0)  - penalty * 1.5


def tier_upgrade_bonus(product: str, driver_tier: str,
                       per_level: float = 0.05) -> float:
    """
    Small bonus when a higher-tier driver serves a lower-product request.
    Pro serving 'normal'   → +0.10  (2 levels above min)
    Core serving 'normal'  → +0.05  (1 level above min)
    Pro serving 'comfort'  → +0.05  (1 level above min)
    Core serving 'comfort' → 0      (min tier for that product)
    """
    min_rank = _PRODUCT_MIN_TIER_RANK.get(product, 0)
    delta    = TIER_RANK.get(driver_tier, 0) - min_rank
    return per_level * max(delta, 0)


# ─────────────────────────────────────────────────────────────────────────────
# Main matching function
# ─────────────────────────────────────────────────────────────────────────────

def match_request(
    request: Dict[str, Any],
    drivers: List[Dict[str, Any]],
    config:  Dict[str, Any],
) -> Tuple[Optional[int], List[int], Dict[str, Any]]:
    """
    Match one ride request to the best available driver.

    Parameters
    ----------
    request : dict
        Required:   pickup_lat, pickup_lng
                    product  →  "normal"  or  "comfort"
                    (also accepts legacy "tier" field as alias)
        Optional:   dropoff_lat, dropoff_lng, pax_count, max_wait_min,
                    traffic_mult, rider_id, blacklisted_drivers,
                    demand_lat, demand_lng  (city demand centre)

    drivers : list[dict]
        Required:   id, lat, lng, available, tiers
        Optional:   status, trips_today, assigned, idle_min, shift_hours,
                    offered, accepted, canceled, on_time_rate, rating,
                    vehicle_rating, vehicle_seats, heading_deg, speed_kmph_now,
                    consecutive_declines

    config : dict
        Overrides for DEFAULT_CONFIG. Missing keys fall back to defaults.

    Returns
    -------
    best_id    : int | None
    ranked_ids : list[int]   (best → worst)
    debug      : dict        (top-10 candidates with full score breakdown)
    """
    cfg = {**DEFAULT_CONFIG, **config}

    # ── Parse request ─────────────────────────────────────────────────────────
    # Accept "product" (new) or "tier" (legacy alias).
    # Legacy tier names: "economy" → "normal", "premium" → "comfort"
    raw_product = request.get("product", request.get("tier", "normal"))
    if raw_product == "economy":
        raw_product = "normal"
    elif raw_product == "premium":
        raw_product = "comfort"
    # "comfort" maps to "comfort" in both old and new naming
    req_product = raw_product
    prod_meta   = PRODUCT_META.get(req_product, PRODUCT_META["normal"])

    pickup_lat  = request["pickup_lat"]
    pickup_lng  = request["pickup_lng"]
    dropoff_lat = request.get("dropoff_lat")
    dropoff_lng = request.get("dropoff_lng")
    pax_count   = request.get("pax_count", 1)
    traffic     = request.get("traffic_mult", 1.0)
    blacklist: Set[int] = set(request.get("blacklisted_drivers", []))

    # ETA SLA: request override is honoured only if it is stricter than the
    # product default (prevents comfort rides being held to a 20-min SLA)
    req_wait = request.get("max_wait_min", prod_meta["eta_sla_min"])
    max_wait = min(req_wait, prod_meta["eta_sla_min"])

    # Demand centre for dead-mileage (defaults to pickup if not given)
    demand_lat = request.get("demand_lat", pickup_lat)
    demand_lng = request.get("demand_lng", pickup_lng)

    # ── Radius expansion loop ─────────────────────────────────────────────────
    radius     = cfg["max_radius_km"]
    exp_factor = cfg["radius_expansion_factor"]
    max_exps   = cfg["max_radius_expansions"]

    feasible:   List[Tuple[float, Dict]] = []
    ranked:     List[Tuple[float, int]]  = []
    debug_rows: List[Dict[str, Any]]     = []
    attempt = 0

    while attempt <= max_exps:
        feasible   = []
        ranked     = []
        debug_rows = []

        for d in drivers:

            # ── Hard filter 1: availability & status ──────────────────────────
            if not d.get("available", True):
                continue
            if d.get("status", "idle") in ("on_trip", "offline"):
                continue

            # ── Hard filter 2: blacklist ──────────────────────────────────────
            if d["id"] in blacklist:
                continue

            # ── Hard filter 3: product eligibility ───────────────────────────
            #    Normal  → all tiers ok
            #    Comfort → Core + Pro only (Starter excluded)
            if not can_serve_product(req_product, d):
                continue

            # ── Hard filter 4: acceptance rate floor (Uber-style) ─────────────
            offered  = d.get("offered", 0)
            accepted = d.get("accepted", 0)
            if offered >= 10:
                if (accepted / offered) < prod_meta["min_acceptance_rate"]:
                    continue

            # ── Hard filter 5: driver rating floor ───────────────────────────
            if d.get("rating", 4.0) < prod_meta["min_driver_rating"]:
                continue

            # ── Hard filter 6: vehicle condition floor ────────────────────────
            if d.get("vehicle_rating", 4.0) < prod_meta["min_vehicle_rating"]:
                continue

            # ── Hard filter 7: vehicle capacity ──────────────────────────────
            if d.get("vehicle_seats", 4) < pax_count:
                continue

            # ── Hard filter 8: shift safety hard limit ────────────────────────
            if d.get("shift_hours", 0.0) > cfg["max_shift_hours"]:
                continue

            # ── Hard filter 9: distance / radius ─────────────────────────────
            dist_km = haversine_km(pickup_lat, pickup_lng, d["lat"], d["lng"])
            if dist_km > radius:
                continue

            feasible.append((dist_km, d))

        if feasible:
            break  # found eligible candidates — proceed to scoring

        if attempt == max_exps:
            break  # exhausted all expansions

        radius  *= exp_factor
        attempt += 1

    if not feasible:
        return None, [], {
            "reason":    "no_feasible_drivers",
            "product":   req_product,
            "radius_km": radius,
            "attempts":  attempt + 1,
        }

    # ── Shortlist: sort by distance (ETA proxy) and keep top N ────────────────
    feasible.sort(key=lambda x: x[0])
    shortlist = feasible[:cfg["max_candidates"]]

    # ── Score each candidate ──────────────────────────────────────────────────
    for dist_km, d in shortlist:
        eta_min = estimate_eta_min(dist_km, traffic, cfg["speed_kmph"])

        # ── Hard filter 10: ETA SLA ───────────────────────────────────────────
        if eta_min > max_wait:
            continue

        # ── Individual scoring components ─────────────────────────────────────
        eta_norm     = clamp(eta_min / cfg["eta_cap_min"], 0.0, 2.0)

        # Acceptance rate — Uber's #2 factor
        ar_score     = compute_acceptance_score(d)
        completion   = compute_completion_score(d)
        on_time      = d.get("on_time_rate", 0.85)

        # Quality
        rating_score = compute_rating_score(d)

        # Operational
        fatigue      = compute_shift_fatigue(d, cfg)
        heading_bon  = compute_heading_bonus(d, pickup_lat, pickup_lng)
        dead_pen     = compute_dead_mile_penalty(d, dropoff_lat, dropoff_lng,
                                                 demand_lat, demand_lng)
        decline_pen  = compute_decline_penalty(d, cfg)

        assigned     = d.get("assigned", 0)
        fairness_pen = clamp(assigned / max(cfg["fairness_cap"], 1e-6), 0.0, 2.0)

        idle_min     = d.get("idle_min", 0.0)
        idle_bonus   = clamp(idle_min / cfg["idle_cap_min"], 0.0, 1.0)

        # Wasel tier signal + soft-cap
        d_tier      = driver_max_tier(d)
        trips_today = d.get("trips_today", 0)
        t_bonus     = effective_tier_bonus(d_tier, trips_today, cfg)
        upgrade     = tier_upgrade_bonus(req_product, d_tier,
                                         cfg["upgrade_bonus_per_level"])
        tier_signal = t_bonus + upgrade

        # ── Final score (Uber-style: ETA primary, acceptance rate secondary) ──
        score = (
            - cfg["w_eta"]          * eta_norm
            + cfg["w_acceptance"]   * ar_score
            + cfg["w_rating"]       * rating_score
            + cfg["w_completion"]   * completion
            + cfg["w_on_time"]      * on_time
            + cfg["w_tier"]         * tier_signal
            + cfg["w_idle"]         * idle_bonus
            - cfg["w_fairness"]     * fairness_pen
            - cfg["w_consec_decl"]  * decline_pen
            - cfg["w_shift"]        * fatigue
            + cfg["w_heading"]      * heading_bon
            - cfg["w_dead_mile"]    * dead_pen
        )

        cap = cfg["soft_cap"].get(d_tier, 999)
        ranked.append((score, d["id"]))
        debug_rows.append({
            # Identity
            "driver_id":            d["id"],
            "driver_tier":          d_tier,
            "wasel_tier":           TIER_META[d_tier]["name"],
            "driver_label":         TIER_META[d_tier]["driver_label"],
            "req_product":          req_product,
            # Status
            "status":               d.get("status", "idle"),
            "shift_hours":          round(d.get("shift_hours", 0.0), 1),
            "vehicle_seats":        d.get("vehicle_seats", 4),
            # ETA (PRIMARY dispatch factor)
            "dist_km":              round(dist_km, 3),
            "eta_min":              round(eta_min, 2),
            "eta_norm":             round(eta_norm, 3),
            # Acceptance rate (Uber's #2 factor)
            "acceptance_rate":      round(ar_score, 3),
            "completion_rate":      round(completion, 3),
            "on_time_rate":         round(on_time, 3),
            # Quality
            "rating":               round(d.get("rating", 4.0), 2),
            "vehicle_rating":       round(d.get("vehicle_rating", 4.0), 2),
            "rating_score":         round(rating_score, 3),
            # Wasel tier / soft-cap
            "trips_today":          trips_today,
            "daily_cap":            cap,
            "above_cap":            trips_today >= cap,
            "tier_bonus_eff":       round(t_bonus, 3),
            "upgrade_bonus":        round(upgrade, 3),
            # Operational
            "consecutive_declines": d.get("consecutive_declines", 0),
            "decline_pen":          round(decline_pen, 3),
            "idle_min":             round(idle_min, 1),
            "idle_bonus":           round(idle_bonus, 3),
            "assigned":             assigned,
            "fairness_pen":         round(fairness_pen, 3),
            "fatigue":              round(fatigue, 3),
            "heading_bonus":        round(heading_bon, 3),
            "dead_mile_pen":        round(dead_pen, 3),
            # Final score
            "score":                round(score, 4),
            # Per-component contribution (for waterfall charts)
            "_contrib": {
                "ETA":           round(-cfg["w_eta"]         * eta_norm,     4),
                "Acceptance":    round(+cfg["w_acceptance"]  * ar_score,     4),
                "Rating":        round(+cfg["w_rating"]      * rating_score, 4),
                "Completion":    round(+cfg["w_completion"]  * completion,   4),
                "On-time":       round(+cfg["w_on_time"]     * on_time,      4),
                "Tier":          round(+cfg["w_tier"]        * tier_signal,  4),
                "Idle":          round(+cfg["w_idle"]        * idle_bonus,   4),
                "Fairness":      round(-cfg["w_fairness"]    * fairness_pen, 4),
                "Declines":      round(-cfg["w_consec_decl"] * decline_pen,  4),
                "Shift fatigue": round(-cfg["w_shift"]       * fatigue,      4),
                "Heading":       round(+cfg["w_heading"]     * heading_bon,  4),
                "Dead mile":     round(-cfg["w_dead_mile"]   * dead_pen,     4),
            },
        })

    if not ranked:
        return None, [], {
            "reason":    "all_candidates_failed_sla",
            "product":   req_product,
            "radius_km": radius,
            "attempts":  attempt + 1,
        }

    ranked.sort(reverse=True, key=lambda x: x[0])
    ranked_ids = [x[1] for x in ranked]
    best_id    = ranked_ids[0]

    debug_rows.sort(key=lambda r: r["score"], reverse=True)
    debug = {
        "top":       debug_rows[:min(10, len(debug_rows))],
        "product":   req_product,
        "radius_km": radius,
        "attempts":  attempt + 1,
        "weights":   {k: cfg[k] for k in [
            "w_eta", "w_acceptance", "w_rating", "w_completion",
            "w_on_time", "w_tier", "w_idle", "w_fairness",
            "w_consec_decl", "w_shift", "w_heading", "w_dead_mile",
        ]},
    }
    return best_id, ranked_ids, debug
