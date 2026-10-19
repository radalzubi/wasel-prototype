# Wasel — Algorithm Integration & Frontend Completion
**Date:** 2026-03-05

## Goal
Integrate the Wasel Best Matching Protocol (BMP v3.0) from `wasel_bmp/matching.py` into the React frontend. Fix the data model to use 2 ride products (normal/comfort) instead of 3. Complete all unfinished UI screens.

## Architecture

### New files
- `src/app/algorithm/matching.ts` — TypeScript port of matching.py, runs client-side
- `src/app/components/home/RideProductSelector.tsx`
- `src/app/components/home/DriverMatchCard.tsx`
- `src/app/components/home/BookingSheet.tsx`

### Modified files
- `src/app/data/mockData.ts` — 2 ride products, enriched driver data
- `src/app/screens/HomeScreen.tsx` — wired to algorithm, split into sub-components
- `src/app/screens/SettingsScreen.tsx` — add Notifications + BecomeDriver sub-screens
- `src/app/data/translations.ts` — add keys for new product names

## Data Model Changes

### Ride Products (rider-facing): 2 options
| Product  | Display EN | Display AR | Eligible Drivers |
|----------|-----------|-----------|-----------------|
| `normal` | Normal    | عادي      | All tiers        |
| `comfort`| Comfort   | مريح      | Core + Pro only  |

### Driver Tier (subscription): unchanged — 3 tiers
- `economy` → Starter (JD 20/mo, cap 6/day)
- `comfort` → Core (JD 35/mo, cap 9/day)
- `premium` → Pro (JD 55/mo, cap 12/day)

### Driver enrichment fields added to mockData
`tiers[]`, `offered`, `accepted`, `canceled`, `on_time_rate`, `trips_today`, `shift_hours`, `idle_min`, `consecutive_declines`, `vehicle_rating`, `vehicle_seats`, `speed_kmph_now`, `heading_deg`, `status`

## Algorithm Integration
When user confirms pickup + product → `matchRequest(request, DRIVERS, {})` → `best_id` selects which driver card to show.

## Settings Completions
- Notifications sub-screen: toggles for ride updates, promotions, news alerts
- BecomeDriver sub-screen: tier comparison table (Starter/Core/Pro), CTA
