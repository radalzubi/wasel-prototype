#!/usr/bin/env node
/**
 * Wasel Core Flow Test
 *
 * Covers the 5 critical flows:
 *   1. Rider creates a ride request
 *   2. Driver receives the offer (polling)
 *   3. Driver accepts the offer
 *   4. Trip transitions through en_route → arrived → in_progress → completed
 *   5. Rider sees the completed trip in history
 *
 * Requirements:
 *   - Backend must be running and reachable at BASE_URL
 *   - Backend should use the real database/service-role path
 *   - Auth should be in dev-token mode (blank publishable/anon keys)
 *
 * Run:
 *   # Recommended one-command integration run:
 *   cd backend && npm run test:flow:stack
 *
 *   # Or if the backend is already running in the correct mode:
 *   node backend/tests/flow.js
 *
 *   # Or against a specific port:
 *   WASEL_BASE=http://localhost:3001 node backend/tests/flow.js
 */

'use strict';

const BASE_URL = process.env.WASEL_BASE ?? 'http://localhost:3001';

// ── helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function post(path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: json };
}

async function patch(path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: json };
}

async function get(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: json };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function failFast(message) {
  console.error(`\n${message}\n`);
  printSummary();
}

// ── main test ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n========================================');
  console.log('  Wasel Core Flow Test');
  console.log(`  Target: ${BASE_URL}`);
  console.log('========================================\n');

  // ── 0. Health check ──────────────────────────────────────────────────────
  console.log('[ 0 ] Health check');
  const health = await get('/health');
  assert(health.ok, 'backend responds 200 on /health');
  if (!health.ok) {
    console.error('\nBackend is not reachable. Start it first:\n  cd backend && npm run dev\n');
    process.exit(1);
  }
  console.log();

  // ── 1. Auth — rider ──────────────────────────────────────────────────────
  console.log('[ 1 ] Rider auth');
  const RIDER_PHONE  = '+96279001001';
  const DRIVER_PHONE = '+96279001002';

  const riderSend = await post('/api/auth/send-otp', { phone: RIDER_PHONE });
  assert(riderSend.ok, `send-otp for rider returns 2xx (got ${riderSend.status})`);

  const riderVerify = await post('/api/auth/verify', { phone: RIDER_PHONE, token: '123456', role: 'rider' });
  assert(riderVerify.ok, `verify OTP for rider returns 2xx (got ${riderVerify.status})`);
  assert(typeof riderVerify.body?.session?.access_token === 'string', 'rider verify returns access_token');
  assert(typeof riderVerify.body?.user?.id === 'string', 'rider verify returns user.id');

  const RIDER_TOKEN = riderVerify.body?.session?.access_token ?? '';
  const RIDER_ID    = riderVerify.body?.user?.id ?? '';
  console.log(`  → rider_id: ${RIDER_ID}`);
  console.log();

  if (!RIDER_TOKEN || !RIDER_ID) {
    failFast(
      'Auth setup failed. This flow test expects dev-token auth.\n' +
      'Start the backend with SUPABASE_PUBLISHABLE_KEY and SUPABASE_ANON_KEY blank while keeping the service-role-backed database config loaded.\n' +
      'Use: npm run test:flow:stack'
    );
    return;
  }

  // ── 2. Auth — driver ─────────────────────────────────────────────────────
  console.log('[ 2 ] Driver auth');
  const driverSend = await post('/api/auth/send-otp', { phone: DRIVER_PHONE });
  assert(driverSend.ok, `send-otp for driver returns 2xx (got ${driverSend.status})`);

  const driverVerify = await post('/api/auth/verify', { phone: DRIVER_PHONE, token: '123456', role: 'driver' });
  assert(driverVerify.ok, `verify OTP for driver returns 2xx (got ${driverVerify.status})`);
  assert(typeof driverVerify.body?.session?.access_token === 'string', 'driver verify returns access_token');

  const DRIVER_TOKEN = driverVerify.body?.session?.access_token ?? '';
  const DRIVER_ID    = driverVerify.body?.user?.id ?? '';
  console.log(`  → driver_id: ${DRIVER_ID}`);
  console.log();

  if (!DRIVER_TOKEN || !DRIVER_ID) {
    failFast(
      'Driver auth setup failed. This flow test expects dev-token auth.\n' +
      'Use: npm run test:flow:stack'
    );
    return;
  }

  // ── 3. Driver goes online ─────────────────────────────────────────────────
  console.log('[ 3 ] Driver online + location');
  const locRes = await patch(`/api/drivers/${DRIVER_ID}/location`, { lat: 31.9501, lng: 35.9101 }, DRIVER_TOKEN);
  assert(locRes.ok, `driver location update returns 2xx (got ${locRes.status})`);

  const statusRes = await patch(`/api/drivers/${DRIVER_ID}/status`, { isOnline: true, isAvailable: true }, DRIVER_TOKEN);
  assert(statusRes.ok, `driver status update returns 2xx (got ${statusRes.status})`);
  console.log();

  // ── 4. Rider requests ride ────────────────────────────────────────────────
  console.log('[ 4 ] Rider requests ride');
  const tripRes = await post('/api/trips', {
    pickup:             { lat: 31.9500, lng: 35.9100 },
    destination:        { lat: 31.9600, lng: 35.9200 },
    pickupAddress:      'Test Pickup — Al-Sweifiyyeh',
    destinationAddress: 'Test Destination — Abdali',
    tier:               'normal',
    paymentMethod:      'cash',
  }, RIDER_TOKEN);

  assert(tripRes.ok, `create trip returns 2xx (got ${tripRes.status})`);
  assert(typeof tripRes.body?.tripId === 'string', 'create trip returns tripId');

  const TRIP_ID = tripRes.body?.tripId ?? '';
  console.log(`  → trip_id: ${TRIP_ID}`);
  console.log();

  // ── 5. Driver receives offer ──────────────────────────────────────────────
  console.log('[ 5 ] Driver receives offer (polling up to 5s)');
  let OFFER_ID = '';
  for (let i = 0; i < 5; i++) {
    await sleep(1000);
    const offersRes = await get(`/api/drivers/${DRIVER_ID}/offers/pending`, DRIVER_TOKEN);
    if (offersRes.ok && Array.isArray(offersRes.body) && offersRes.body.length > 0) {
      OFFER_ID = String(offersRes.body[0]?.id ?? '');
      break;
    }
  }
  assert(OFFER_ID !== '', 'driver receives at least one pending offer within 5 seconds');
  console.log(`  → offer_id: ${OFFER_ID}`);
  console.log();

  if (!OFFER_ID) {
    console.error('Cannot continue without offer. Check dispatch engine + driver availability.\n');
    printSummary();
    return;
  }

  // ── 6. Driver accepts offer ───────────────────────────────────────────────
  console.log('[ 6 ] Driver accepts offer');
  const acceptRes = await post(`/api/trips/${TRIP_ID}/accept`, { offerId: OFFER_ID }, DRIVER_TOKEN);
  assert(acceptRes.ok, `accept trip returns 2xx (got ${acceptRes.status})`);

  const tripAfterAccept = await get(`/api/trips/${TRIP_ID}`, RIDER_TOKEN);
  assert(
    ['accepted', 'dispatching'].includes(String(tripAfterAccept.body?.status ?? '')),
    `trip status is accepted or dispatching after accept (got "${tripAfterAccept.body?.status}")`
  );
  console.log();

  // ── 7. Status transitions ─────────────────────────────────────────────────
  console.log('[ 7 ] Trip status transitions');
  const transitions = ['en_route', 'arrived', 'in_progress', 'completed'];
  for (const status of transitions) {
    const r = await patch(`/api/trips/${TRIP_ID}/status`, { status }, DRIVER_TOKEN);
    assert(r.ok, `PATCH status → "${status}" returns 2xx (got ${r.status})`);
    await sleep(200);
  }
  console.log();

  // ── 8. Final trip state ───────────────────────────────────────────────────
  console.log('[ 8 ] Final trip state');
  const finalTrip = await get(`/api/trips/${TRIP_ID}`, RIDER_TOKEN);
  assert(finalTrip.ok, `GET /api/trips/${TRIP_ID} returns 2xx`);
  assert(finalTrip.body?.status === 'completed', `final trip status is "completed" (got "${finalTrip.body?.status}")`);
  console.log();

  // ── 9. Rider trip history ─────────────────────────────────────────────────
  console.log('[ 9 ] Rider trip history');
  const riderHistory = await get(`/api/riders/${RIDER_ID}/trips`, RIDER_TOKEN);
  assert(riderHistory.ok, `GET /api/riders/${RIDER_ID}/trips returns 2xx (got ${riderHistory.status})`);
  const historyList = Array.isArray(riderHistory.body) ? riderHistory.body : (riderHistory.body?.trips ?? []);
  const foundInHistory = historyList.some(t => t.id === TRIP_ID || t.tripId === TRIP_ID);
  assert(foundInHistory, `completed trip appears in rider history`);
  console.log();

  // ── 10. Driver trip history ───────────────────────────────────────────────
  console.log('[ 10 ] Driver trip history');
  const driverHistory = await get(`/api/drivers/${DRIVER_ID}/trips`, DRIVER_TOKEN);
  assert(driverHistory.ok, `GET /api/drivers/${DRIVER_ID}/trips returns 2xx (got ${driverHistory.status})`);
  const driverHistoryList = Array.isArray(driverHistory.body) ? driverHistory.body : [];
  const foundInDriverHistory = driverHistoryList.some(t => t.id === TRIP_ID || t.tripId === TRIP_ID);
  assert(foundInDriverHistory, `completed trip appears in driver history`);
  console.log();

  printSummary();
}

function printSummary() {
  console.log('========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('\nUnhandled test error:', err.message);
  process.exit(1);
});
