# Testing Playbook

## Critical manual tests

### 1. Rider OTP login
- Send OTP and verify.
- Expect active session in localStorage.

### 2. Driver OTP login + online status
- Login driver.
- Toggle online.
- Verify `/api/drivers/:id/status` succeeds.

### 3. Trip request + dispatch
- Rider requests trip.
- Verify trip created in DB and enters dispatching flow.
- Driver sees offer in near realtime.

### 4. Accept + state machine
- Driver accepts trip.
- Verify single-driver optimistic lock behavior (no double assignment).
- Move through statuses in order.
- Verify invalid transition returns `400`.

### 5. Live tracking
- Driver app sends location every ~8-10s.
- Rider sees moving driver marker.

### 6. Cancel path
- Rider/driver cancels before start.
- Verify status becomes `cancelled` and reason saved.

### 7. Completion + history
- Complete trip.
- Verify appears in rider and driver history endpoints.
- Verify earnings endpoint updates for driver.

## 2026-03-08 execution notes
- Backend + rider + driver production builds passed.
- OTP send endpoint reached Twilio/Supabase successfully; test failed on invalid destination number (`21211`) which confirms real OTP path is active.
- OTP test input used: `+96279000001` via `POST /api/auth/send-otp`.
- Full 2-device/simulator manual flow was not executable from this shell-only environment (no simulator UI control and no valid OTP handset available in-session).
- Local development-mode smoke test passed for create-trip + cancel fallback + secured history endpoints.

## Manual E2E run checklist (real OTP, two simulators)
1. Start backend with valid Supabase + service-role env.
2. Start rider app and driver app.
3. Login rider with a real OTP-capable number.
4. Login driver with a real OTP-capable number.
5. Set driver online from dashboard.
6. Rider requests trip with pickup/destination.
7. Confirm driver receives realtime offer.
8. Accept offer and verify rider sees matched state.
9. Driver advances status: `en_route` -> `arrived` -> `in_progress` -> `completed`.
10. Confirm rider completion state and both history screens show the trip.
