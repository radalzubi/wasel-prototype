# Wasel Platform — Launch Readiness Checklist

## How to use this list
- ✅ Already done (in this implementation)
- ⬜ Needs external service / manual configuration
- 🔴 Blocker — cannot launch without this
- 🟡 Important — should be done before full launch
- 🟢 Enhancement — can be done post-launch

---

## Part 1: Backend Readiness

### Core Infrastructure
- ✅ Express server with TypeScript
- ✅ Helmet security headers
- ✅ Rate limiting on auth endpoints (10 req/10min)
- ✅ CORS configured
- ✅ Global error handler
- ✅ Health check endpoint (`GET /api/health`)
- ⬜ 🔴 Deploy to a server (Railway, Render, Fly.io, or VPS)
- ⬜ 🔴 Set `NODE_ENV=production` in deployment
- ⬜ 🟡 Configure production CORS origins (not localhost)
- ⬜ 🟡 Add `SUPABASE_SERVICE_ROLE_KEY` to production environment
- ⬜ 🟢 Add request logging (e.g. morgan or pino)

### Authentication
- ✅ Phone OTP send endpoint
- ✅ Phone OTP verify endpoint
- ✅ JWT validation middleware (requireAuth, requireDriver, requireAdmin)
- ✅ Role-based access (rider, driver, admin)
- ✅ Token refresh endpoint
- ⬜ 🔴 Enable SMS provider in Supabase (Twilio or MessageBird)
- ⬜ 🟡 Test OTP delivery to Jordanian phone numbers (+962)
- ⬜ 🟡 Configure Supabase Auth rate limits for production
- ⬜ 🟢 Token blacklisting / session revocation table

### Database
- ✅ Supabase project connected
- ✅ Core schema designed (drivers, riders, trips, etc.)
- ✅ trip_offers table with Realtime enabled
- ✅ trip_status_history audit log
- ✅ dispatch_log for BMP scoring audit
- ⬜ 🔴 Run `schema.sql` in Supabase SQL Editor
- ⬜ 🔴 Run `001_trip_offers_and_history.sql` in Supabase SQL Editor
- ⬜ 🟡 Add Row Level Security (RLS) policies (see below)
- ⬜ 🟡 Add database indexes for common queries (trip_id, driver_id, rider_id, status)
- ⬜ 🟡 Enable Supabase point-in-time recovery (for production data safety)
- ⬜ 🟢 Add pg_cron for expiring stale trip_offers (15s TTL cleanup)
- ⬜ 🟢 PostGIS for geospatial queries (already in Supabase)

### Recommended RLS Policies (to write)
```sql
-- Riders can only see their own trips
CREATE POLICY rider_trips ON trips FOR SELECT
  USING (auth.uid() = rider_id);

-- Drivers can only see trips assigned to them
CREATE POLICY driver_trips ON trips FOR SELECT
  USING (auth.uid() = driver_id);

-- Drivers can only see their own offers
CREATE POLICY driver_offers ON trip_offers FOR SELECT
  USING (auth.uid() = driver_id);

-- Drivers can only update their own location
CREATE POLICY driver_own_location ON drivers FOR UPDATE
  USING (auth.uid() = id);
```

### Dispatch Engine
- ✅ BMP scoring algorithm (proximity + subscription + activity + idle)
- ✅ Driver candidate querying
- ✅ trip_offers insertion for Realtime delivery
- ✅ dispatch_log audit trail
- ✅ Admin manual override endpoint
- ⬜ 🟡 Offer expiry cleanup (mark pending offers as 'expired' after 15s)
- ⬜ 🟡 Re-dispatch on driver decline (currently does not retry with next candidate)
- ⬜ 🟡 Prevent double-assignment race condition (use Postgres advisory lock or optimistic concurrency)
- ⬜ 🟢 Service zone filtering (only dispatch drivers within operational area)
- ⬜ 🟢 Peak hour supply/demand metrics

### Payments
- ✅ Cash payment method supported
- ✅ CliQ payment method field on trip record
- ⬜ 🔴 Integrate a real CliQ gateway (JoMoPay, Dinarak, or direct bank API)
- ⬜ 🟡 Payment confirmation webhook/callback
- ⬜ 🟡 Fare dispute flow
- ⬜ 🟢 Driver earnings ledger table
- ⬜ 🟢 Weekly payout calculation

---

## Part 2: Driver App Readiness

### Auth & Onboarding
- ✅ Phone OTP login screen
- ✅ Session persistence across app restarts
- ✅ Logout
- ⬜ 🟡 Driver registration / onboarding form (name, vehicle type, plate number)
- ⬜ 🟡 Document upload (national ID, driving license, vehicle registration)
- ⬜ 🟡 Admin approval step before driver can go online
- ⬜ 🟢 Profile photo upload

### Core Operations
- ✅ Online / offline toggle (calls API)
- ✅ Real-time trip offer receipt (Supabase Realtime)
- ✅ Accept / decline offer UI
- ✅ Navigation screen with stage progression (en_route → arrived → in_progress → completed)
- ✅ GPS location updates every 8-10s
- ✅ Trip history list
- ⬜ 🟡 Sound/vibration alert on incoming offer (Capacitor Haptics + local notification)
- ⬜ 🟡 Turn-by-turn navigation handoff (open Google Maps / Waze with coordinates)
- ⬜ 🟡 Cancellation reason selection
- ⬜ 🟡 Show rider phone number for contact

### Earnings & Subscription
- ⬜ 🟡 Earnings summary screen (daily / weekly / monthly)
- ⬜ 🟡 Subscription status screen (Silver / Gold / Platinum)
- ⬜ 🟡 Subscription upgrade / payment flow
- ⬜ 🟢 Subscription expiry reminder notification

### Support
- ⬜ 🟡 In-app support contact (WhatsApp link or form)
- ⬜ 🟢 Issue reporting on completed trip

---

## Part 3: Rider App Readiness

### Auth
- ✅ Phone OTP login screen
- ✅ Session persistence
- ✅ Logout with confirmation
- ⬜ 🟡 Account deletion option (required for App Store)
- ⬜ 🟡 Profile edit (name, saved addresses)

### Core Trip Flow
- ✅ Home screen with map
- ✅ Destination input
- ✅ Trip request (POST /api/trips)
- ✅ Fare estimate display
- ⬜ 🔴 Real-time trip status polling or Realtime subscription after trip accepted
- ⬜ 🔴 Driver en-route ETA display
- ⬜ 🟡 Driver location on map while waiting
- ⬜ 🟡 Cancel ride button (before driver arrives)
- ⬜ 🟡 Payment method selection (Cash / CliQ) in UI
- ⬜ 🟡 Post-trip rating screen
- ⬜ 🟢 Saved home / work addresses
- ⬜ 🟢 Trip history screen for riders

### UX & Polish
- ✅ Session-based greeting (personalized name from auth)
- ✅ Settings screen with working save / logout
- ⬜ 🟡 Loading states on all async actions
- ⬜ 🟡 Error states (network failure, no drivers available)
- ⬜ 🟡 Empty state for trip history
- ⬜ 🟡 Offline banner / poor connection handling
- ⬜ 🟢 Onboarding flow for first-time users
- ⬜ 🟢 Push notification when driver accepted

---

## Part 4: App Store Readiness

### iOS (Apple App Store)
- ⬜ 🔴 Capacitor project initialized (`npx cap init`)
- ⬜ 🔴 iOS platform added (`npx cap add ios`)
- ⬜ 🔴 Xcode project configured with Bundle ID
- ⬜ 🔴 Apple Developer account enrolled ($99/year)
- ⬜ 🔴 App icons at all required sizes (use Capacitor Assets tool)
- ⬜ 🔴 Splash screen configured
- ⬜ 🔴 Location permission strings in `Info.plist`:
  - `NSLocationWhenInUseUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription` (driver only)
- ⬜ 🔴 Privacy Policy URL
- ⬜ 🔴 Account deletion mechanism (App Store requirement since 2022)
- ⬜ 🟡 App Store Connect listing created (name, description, screenshots)
- ⬜ 🟡 TestFlight internal testing group set up
- ⬜ 🟡 At least one physical device test
- ⬜ 🟢 App Store review notes explaining OTP flow (often flagged)

### Android (Google Play Store)
- ⬜ 🔴 Android platform added (`npx cap add android`)
- ⬜ 🔴 Android Studio project configured
- ⬜ 🔴 Google Play Developer account ($25 one-time)
- ⬜ 🔴 Location permissions in `AndroidManifest.xml`:
  - `ACCESS_FINE_LOCATION`
  - `ACCESS_BACKGROUND_LOCATION` (driver app)
- ⬜ 🔴 App icons and adaptive icons
- ⬜ 🔴 Keystore file for release signing
- ⬜ 🟡 Play Console listing created
- ⬜ 🟡 Internal testing track

### Capacitor Setup Commands
```bash
# Install Capacitor in each app
npm install @capacitor/core @capacitor/cli
npm install @capacitor/app @capacitor/geolocation @capacitor/haptics @capacitor/local-notifications

# Initialize
npx cap init "Wasel" "com.wasel.rider" --web-dir dist
# or for driver app:
npx cap init "Wasel Driver" "com.wasel.driver" --web-dir dist

# Add platforms
npx cap add ios
npx cap add android

# Build and sync
npm run build && npx cap sync

# Open native IDE
npx cap open ios      # opens Xcode
npx cap open android  # opens Android Studio
```

---

## Part 5: Security & Production Hardening

- ✅ Helmet security headers
- ✅ Rate limiting on auth endpoints
- ✅ JWT validation on protected endpoints
- ✅ Driver/rider role separation
- ✅ No client-side trusted logic for pricing
- ✅ Service role key used server-side only
- ✅ Input validation on trip creation
- ⬜ 🔴 Add RLS policies to Supabase tables
- ⬜ 🔴 Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend builds
- ⬜ 🟡 Add input validation library (zod or joi) on all POST/PATCH endpoints
- ⬜ 🟡 Implement dispatch race condition protection (advisory lock)
- ⬜ 🟡 Add HTTPS / TLS termination in production (handled by Railway/Render/Nginx)
- ⬜ 🟡 Audit log for admin actions
- ⬜ 🟡 Alert on repeated auth failures (brute force detection)
- ⬜ 🟢 Regular database backups verified
- ⬜ 🟢 Secrets rotation plan

---

## Part 6: Operations & Monitoring

- ✅ Admin metrics endpoint (`GET /api/admin/metrics`)
- ✅ dispatch_log table for BMP audit trail
- ✅ trip_status_history for state transition audit
- ⬜ 🟡 Set up error monitoring (Sentry free tier is sufficient to start)
- ⬜ 🟡 Set up uptime monitoring (Better Uptime, UptimeRobot)
- ⬜ 🟡 Basic admin dashboard (can be a simple React page reading `/api/admin/*`)
- ⬜ 🟡 Alert on zero online drivers during operational hours
- ⬜ 🟡 Alert on failed dispatch rate > 20%
- ⬜ 🟢 Grafana or Metabase dashboard on top of Supabase Postgres
- ⬜ 🟢 Geographic demand heatmap

---

## Part 7: Dispatch Testing with Real People

### Phase 0 — Internal Test (Immediate)
- ✅ `/api/admin/dispatch/override` endpoint for manual assignment
- ✅ `wasel-dispatch-test` skill for algorithmic testing
- ⬜ 🟡 Seed 5-10 test drivers via SQL script (different locations, tiers)
- ⬜ 🟡 Internal team test: team members as riders, devs as dispatchers

### Phase 1 — Closed Beta (Weeks 1-2)
- ⬜ 🟡 Invite 10-20 trusted drivers (WhatsApp group)
- ⬜ 🟡 Invite 20-30 trusted riders from network
- ⬜ 🟡 Define 1-2 test zones in Amman (e.g. Abdoun, Sweifieh)
- ⬜ 🟡 Define test hours (e.g. 6pm-10pm on weekdays)
- ⬜ 🟡 Ops person monitors `/api/admin/metrics` during test
- ⬜ 🟡 WhatsApp support channel for beta testers

### Phase 2 — Shadow Dispatch Mode (Weeks 3-4)
- ⬜ 🟢 BMP suggests driver → ops confirms manually before offer is sent
- ⬜ 🟢 Capture real acceptance rates, timing, zone patterns
- ⬜ 🟢 Compare manual decisions vs BMP recommendations

### Phase 3 — Full Automated Dispatch (Month 2+)
- ⬜ 🟢 Automated dispatch live
- ⬜ 🟢 Re-dispatch on decline (top-N candidates with fallback)
- ⬜ 🟢 Cancellation penalty factored into BMP scores

---

## Part 8: External Services Needed

| Service | Purpose | Priority |
|---------|---------|----------|
| Twilio / MessageBird | SMS OTP delivery | 🔴 Required |
| Google Maps Platform | Maps + Places API in rider app | 🔴 Required |
| CliQ gateway (JoMoPay, etc.) | Real digital payment | 🟡 Before payments go live |
| Sentry | Error monitoring | 🟡 Before launch |
| Railway / Render / Fly.io | Backend hosting | 🔴 Required for production |
| Apple Developer Program | iOS App Store | 🔴 For iOS release |
| Google Play Console | Android store | 🔴 For Android release |
| UptimeRobot | Uptime monitoring | 🟡 After launch |

---

## Summary: Minimum to Run a Real Pilot

1. ⬜ Run both SQL migrations in Supabase
2. ⬜ Add `SUPABASE_SERVICE_ROLE_KEY` to backend `.env`
3. ⬜ Enable Twilio/MessageBird in Supabase Auth
4. ⬜ Enable Google Maps APIs and add key to rider app
5. ⬜ Deploy backend (Railway or Render, free tier works for pilot)
6. ⬜ Deploy rider app (Vercel or Netlify, free)
7. ⬜ Deploy driver app (Vercel or Netlify, free)
8. ⬜ Seed 3-5 test drivers in Supabase
9. ⬜ Test end-to-end: rider requests → dispatch → driver receives via Realtime → accept → complete

That's all you need for a real dispatch pilot. Everything else can be iterated.
