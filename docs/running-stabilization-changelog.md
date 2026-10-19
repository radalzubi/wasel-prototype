# Running Stabilization Changelog

Last updated: 2026-03-08

## Fixes Applied

### 2026-03-08 (Pass A)
- Hardened backend Supabase key handling:
  - `backend/src/lib/supabase.ts`
  - Production now requires `SUPABASE_SERVICE_ROLE_KEY`; anon/publishable fallback is development-only.
- Tightened trip read authorization:
  - `backend/src/routes/trips.ts`
  - `GET /api/trips/:id` now requires rider ownership, driver ownership, admin role, or existing pending/accepted offer for that driver.
- Reduced rider realtime location overexposure:
  - `RIDER/Ride-hailing app for MENA/src/app/screens/HomeScreen.tsx`
  - `driver_locations` subscription now filtered by active `trip_id`.
- Added/wired dedicated history screens:
  - Rider: `RIDER/Ride-hailing app for MENA/src/app/screens/TripHistoryScreen.tsx`, `.../SettingsScreen.tsx`
  - Driver: `driver_app/src/screens/TripHistoryScreen.tsx`, `driver_app/src/screens/DashboardScreen.tsx`, `driver_app/src/App.tsx`, `driver_app/src/lib/api.ts`

### 2026-03-08 (Pass B)
- Locked driver list route to admin only:
  - `backend/src/routes/drivers.ts`
  - `GET /api/drivers` now requires authenticated admin.
- Aligned in-memory fallback privacy with production DTO behavior:
  - `backend/src/routes/drivers.ts`
  - Non-owner reads now return public-safe driver shape (no phone/subscription internals).
- Tightened production CORS model:
  - `backend/src/index.ts`
  - Production now checks exact `CORS_ORIGINS` allowlist; dev keeps localhost/capacitor allowances.
- Reconciled base schema away from permissive open RLS:
  - `backend/supabase/schema.sql`
  - Removed `backend_all_* USING (true)` policy creation and replaced with restrictive baseline policies.

### 2026-03-08 (Pass C - Final High-Fidelity)
- Secured trip acceptance ownership and race path:
  - `backend/src/routes/trips.ts`
  - Driver must own a pending offer for the trip before acceptance.
  - Acceptance now updates the winning offer and expires competing pending offers.
- Secured decline ownership path:
  - `backend/src/routes/trips.ts`
  - Driver can only decline their own pending offer.
- Hardened actor permissions on status updates:
  - `backend/src/routes/trips.ts`
  - Riders can only cancel via status endpoint.
  - Drivers can only perform driver-relevant transitions.
- Fixed driver availability consistency:
  - `backend/src/routes/trips.ts`
  - Driver is marked available after cancel/complete.
  - Driver totals (`total_trips`, `total_earnings`) are updated on completion.
- Removed rider-side fake dispatch fallback:
  - `RIDER/Ride-hailing app for MENA/src/app/screens/HomeScreen.tsx`
  - No local matching fallback on backend failure.
  - Ride request now fails explicitly with visible error when backend is unavailable.
- Reduced rider-side simulated trip controls:
  - `RIDER/.../HomeScreen.tsx`
  - Removed rider-driven “simulate completion” flow in active trip.
  - Trip progression now depends on backend/driver status updates.
- Added driver hydration after assignment:
  - `RIDER/.../HomeScreen.tsx`
  - Rider UI fetches assigned driver details from backend when trip is accepted.
- Added realtime sync on active driver trip screen:
  - `driver_app/src/screens/NavigationScreen.tsx`
  - Driver app now listens for trip updates and reacts to cancellation/completion in realtime.

### 2026-03-08 (Pass D - Rider→Driver Flow Tightening)
- Secured driver location updates against trip spoofing:
  - `backend/src/routes/drivers.ts`
  - If `tripId` is provided, backend now verifies trip ownership and active status before writing location.
- Improved cancellation cleanup:
  - `backend/src/routes/trips.ts`
  - Cancel now expires pending offers for the trip to avoid stale dispatch state.
- Added accept status-history logging:
  - `backend/src/routes/trips.ts`
  - Accept action now writes `trip_status_history` row for debugging/audit continuity.
- Fixed lifecycle transition gap:
  - `driver_app/src/screens/NavigationScreen.tsx`
  - Driver entering navigation now immediately patches trip status to `en_route`.
- Removed rider-side fake live progression:
  - `RIDER/.../HomeScreen.tsx`
  - Rider no longer auto-advances to `in_progress` based on countdown timer.
  - Removed synthetic driver marker movement fallback; location now reflects real backend-fed data only.

### 2026-03-08 (Pass E - Realtime Resilience + Live Verification)
- Added runtime-robust fallback for offer delivery:
  - `backend/src/routes/drivers.ts` adds `GET /api/drivers/:id/offers/pending`.
  - `driver_app/src/lib/api.ts` + `driver_app/src/App.tsx` now poll pending offers every 3s when online/dashboard and hydrate offer UI if realtime misses.
- Added runtime-robust fallback for trip status synchronization:
  - Rider: `RIDER/.../HomeScreen.tsx` now polls `GET /api/trips/:id` every 4s while trip is active.
  - Driver: `driver_app/src/screens/NavigationScreen.tsx` now polls `GET /api/trips/:id` every 4s while active.
- Live Supabase runtime verification executed:
  - Scripted rider->dispatch->offer->accept->status progression (`en_route`,`arrived`,`in_progress`,`completed`) succeeded with persisted history rows in rider and driver history endpoints.
  - Verified offer insertion event delivered via Realtime subscription on `trip_offers`.
  - Critical observation: `trips` UPDATE realtime delivery did not appear in service-key subscriber checks; mitigated for MVP by polling fallback in both apps.

### 2026-03-08 (Pass F - iPhone Readiness)
- iOS deployment target raised to 16.0 in both Xcode projects:
  - `driver_app/ios/App/App.xcodeproj/project.pbxproj`
  - `RIDER/Ride-hailing app for MENA/ios/App/App.xcodeproj/project.pbxproj`
- Capacitor iOS runtime settings improved:
  - Enabled `allowsInlineMediaPlayback: true` in both capacitor configs.
- Production iOS web bundles re-synced:
  - Executed `npm run build:ios` in both rider and driver apps.
  - Confirmed updated web assets copied into iOS public bundles.
- Permission readiness re-verified:
  - Driver Info.plist includes `NSLocationWhenInUse`, `NSLocationAlwaysAndWhenInUse`, `NSMotionUsageDescription`.
  - Rider Info.plist includes `NSLocationWhenInUse`, `NSMotionUsageDescription`.

### 2026-03-08 (Pass G - Rider UI Runtime Fixes)
- Fixed Google Maps env key mismatch in Rider app:
  - `RIDER/.../config/maps.ts`
  - Map key now supports both `VITE_GOOGLE_MAPS_API_KEY` and legacy `VITE_GOOGLE_MAPS_KEY`.
- Improved Rider map failure visibility:
  - `RIDER/.../HomeScreen.tsx`
  - Map failure state now explicitly shows missing-key message when key is absent.
- Fixed News image rendering resilience:
  - `RIDER/.../NewsScreen.tsx`
  - Added robust image fallback chain (`article.image` -> `sourceLogo` -> category emoji placeholder).
  - Prevents blank/failed news cards when remote image hosts block hotlinking.

## High-Risk Issues Identified

1. Real Supabase state not fully verified from this environment.
   - Migrations/realtime setup exists in code, but live-project application status cannot be guaranteed without dashboard/DB access.

2. Full manual E2E OTP flow not yet completed on two simulators/devices.
   - Real OTP endpoint is active, but successful end-to-end verification requires valid test numbers and simulator/device execution.

3. Historical secrets risk.
   - `.env` files still exist locally (ignored), and prior exposure in history cannot be ruled out without key rotation and history audit.

## Unresolved Blockers

- Cannot directly run Supabase SQL against project from this shell due to missing direct DB/CLI access in-session.
- Cannot complete native two-simulator interaction from this shell-only environment.
- Need operator confirmation that Google Maps API key restrictions are enforced in Google Cloud console.

### 2026-03-08 (Pass H - CORS/Navigation/History Stabilization)
- Bug: Capacitor CORS hardening for iOS origins
  - Repro: Capacitor-origin requests can fail outside permissive dev mode if `CORS_ORIGINS` misses mobile origins.
  - Root cause: Exact allowlist in non-dev relied only on env values.
  - Patch: Added hardcoded allowlist entries (`http://localhost:5173`, `http://localhost:5174`, `capacitor://localhost`, `ionic://localhost`) merged with env origins in `backend/src/index.ts`.
  - Verification: Preflight check returned `Access-Control-Allow-Origin: capacitor://localhost`.

- Bug: Driver navigation button no-op during `in_progress`
  - Repro: `Navigate` button returned early because destination coordinates were null in `in_progress` stage.
  - Root cause: `openNavigation` incorrectly assigned null destination for `in_progress`.
  - Patch: `driver_app/src/screens/NavigationScreen.tsx` now routes to pickup coords for `en_route`/`arrived` and to destination coords for `in_progress`; propagated `destLat/destLng` in `driver_app/src/App.tsx` offer hydration shape.
  - Verification: Static source validation confirms stage-based coordinate selection now targets destination during `in_progress`.

- Bug: Supabase service role degraded-mode observability
  - Repro: Service role key commented in `backend/.env` caused backend writes to degrade under RLS without explicit required warning.
  - Root cause: Startup logging did not include the requested canonical degraded-mode warning string.
  - Patch: Added startup warning in `backend/src/lib/supabase.ts`:
    `[Supabase] WARNING: No service_role key — backend running in degraded mode. RLS will block writes.`
    plus positive info log when service role is loaded.
  - Verification: TypeScript check passed; startup path now emits deterministic warning/confirmation.

- Bug: Rider history UX resiliency
  - Repro: History screen lacked retry action and skeleton loading, and handled only array-shaped response payloads.
  - Root cause: Narrow response parsing and minimal error UI.
  - Patch: `RIDER/Ride-hailing app for MENA/src/app/screens/TripHistoryScreen.tsx` now supports both `{ trips: [] }` and `[]`, adds skeleton placeholders, retry button, status-colored badges, and required empty-state copy.
  - Verification: Type checks pass for backend and driver app; rider history screen compiles in source.

- Runtime blockers in this sandbox pass:
  - Rider `vite build` blocked by EPERM writing `node_modules/.vite-temp/...`.
  - Rider/Driver `cap sync ios` blocked by EPERM unlink under iOS generated files/podspec paths.

### 2026-03-08 (Pass I - Rider Screen-Fit + UX Recovery)
- Root UI fit architecture fixed for real devices:
  - `RIDER/Ride-hailing app for MENA/src/app/components/MobileFrame.tsx`
  - Removed always-on fixed 390x844 phone shell on native/small screens.
  - Added full-viewport responsive shell for iPhone/simulator with safe-area CSS vars.
  - Kept framed preview behavior for large desktop only.
- Safe-area and bottom-nav overlap fixes:
  - `RIDER/.../src/app/App.tsx`
  - `RIDER/.../src/app/components/BottomNav.tsx`
  - `RIDER/.../src/styles/index.css`
  - App content now reserves nav space via safe-area aware offsets.
  - Bottom nav now uses `minHeight: 64` + safe-area bottom padding.
  - Added global helper classes (`wasel-safe-top`, `wasel-scroll-pad`) and root safe-area vars.
- Rider home-flow reliability fixes:
  - `RIDER/.../src/app/screens/HomeScreen.tsx`
  - Fixed ride-request non-200 path that previously left rider stuck in finding-driver state.
  - Added polling interval cleanup on unmount.
  - Converted top controls and all bottom sheets to safe-area aware offsets.
  - Added explicit missing Google Maps key guidance in map-failure state.
  - Added cancel button during `driver_matched` stage (pre-pickup cancellation path).
- Rider UX and fallback quality fixes:
  - `RIDER/.../src/app/screens/NewsScreen.tsx`
  - Added API error capture, empty-state UI, and retry affordance.
  - Fixed stale auto-refresh dependencies (category/language-aware refresh loop).
  - `RIDER/.../src/app/screens/ExploreScreen.tsx`
  - Safe-area-aware header and bottom scrolling padding.
  - `RIDER/.../src/app/screens/SettingsScreen.tsx`
  - Safe-area-aware headers and scroll containers across nested settings views.
  - `RIDER/.../src/app/screens/TripHistoryScreen.tsx`
  - Safe-area scroll padding and localized status labels with robust date rendering.
  - `RIDER/.../src/app/screens/LoginScreen.tsx`
  - Safe-area/keyboard-friendly layout.
  - OTP input switched to numeric text handling with strict 6-digit clamping.
- Env compatibility hardening:
  - `RIDER/.../src/lib/supabase.ts`
  - Supabase client now accepts both `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_ANON_KEY`.

#### Verification for Pass I
- `cd RIDER/Ride-hailing app for MENA && npm run build` → passed.
- `cd RIDER/Ride-hailing app for MENA && npm run build:ios` → passed (`cap sync ios` completed).

#### High-risk / unresolved after Pass I
- Google Maps still depends on valid/restricted key configuration for Capacitor runtime; code now surfaces this explicitly, but cloud-console restrictions can still block map tiles in-app if misconfigured.
- Rider `.env` still contains real credentials in local workspace and must be rotated/cleaned before any external distribution.

### 2026-03-08 (Pass J - Rider Map Root-Cause Fix)
- Structured root-cause verification completed before edits:
  - Verified `maps.ts` preferred `VITE_GOOGLE_MAPS_KEY` from `.env` over `VITE_GOOGLE_MAPS_API_KEY` from `.env.local`.
  - Verified rider production bundle embedded the legacy key before the fix.
  - This matched the in-app Google Maps authorization failure surface seen on the rider home screen.
- Rider map boot path repaired:
  - `RIDER/Ride-hailing app for MENA/src/app/config/maps.ts`
  - Reversed key precedence so the intended `.env.local` Maps key is used first and the legacy key is fallback only.
- Saved-location and ride-request hardening:
  - `RIDER/Ride-hailing app for MENA/src/app/screens/HomeScreen.tsx`
  - Added place validation before stage transitions.
  - Added current-location bootstrap via `navigator.geolocation`.
  - Added map instance tracking + `fitBounds`/`panTo` behavior for pickup/destination.
  - Fixed ride request payload to send a real destination address instead of nonexistent `destinationPlace.name`.
  - Fixed autocomplete synthetic place shape to use the app’s `Place.type` contract.
  - Added rider-visible location fallback messaging when geolocation is unavailable or denied.

#### Verification for Pass J
- `npm run build` passed for rider.
- `npm run build:ios` passed for rider.
- `npm run build` passed for backend.
- Verified the rebuilt rider bundle and synced iOS bundle now embed:
  - `<REDACTED_GOOGLE_MAPS_KEY>`
  - instead of the legacy `.env` key.

### 2026-03-08 (Pass K - Rider Pickup Flexibility + News Image Stability)
- Structured verification before edits:
  - Confirmed rider search flow only supported destination selection; there was no explicit pickup-selection mode.
  - Confirmed `HomeScreen.tsx` still enforced a hardcoded map-tap pickup restriction and always sent `currentLocation` as the pickup address.
  - Confirmed news DTO mapping preferred unstable external image/logo fallbacks, producing broken placeholders in iOS WebView.
- Rider pickup selection repaired:
  - `RIDER/Ride-hailing app for MENA/src/app/screens/HomeScreen.tsx`
  - Added a real pickup-selection mode alongside destination search.
  - Added idle-sheet pickup summary card with `Set pickup` / `Current location` actions.
  - Allowed search-based remote pickup selection and direct map pinning for pickup.
  - Removed the hardcoded remote-pickup block and warning modal from the map tap flow.
  - Pickup payload now sends the selected pickup address instead of always sending `Current location`.
  - Quick place shortcuts remain destination shortcuts regardless of the last search mode.
- Rider news reliability repaired:
  - `RIDER/Ride-hailing app for MENA/src/app/screens/NewsScreen.tsx`
  - Stopped relying on unstable source-logo fallbacks for article cards.
  - Added deterministic gradient/text fallback tiles when article images fail.
  - Replaced the sponsor emoji tile with stable text rendering to avoid glyph/fallback issues in iOS WebView.

#### Verification for Pass K
- `cd RIDER/Ride-hailing app for MENA && npm run build` → passed.
- `cd RIDER/Ride-hailing app for MENA && npm run build:ios` → passed (`cap sync ios` completed).
- `cd driver_app && npm run build` → passed.
- `cd backend && npx tsc --noEmit` → passed.
