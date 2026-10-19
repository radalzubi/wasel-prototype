# Wasel Architecture

## High-level
- Rider app + Driver app (Capacitor/Vite/React)
- Backend API (Express + TypeScript)
- Supabase (Postgres, Auth, Realtime)

## Responsibilities
- Rider app: request trip, observe trip status, display driver location.
- Driver app: availability, offer handling, trip lifecycle actions, location pings.
- Backend: auth enforcement, dispatch, state machine checks, business rules.
- Supabase: persistence, realtime fanout, RLS access boundaries.

## Core flow
1. Rider creates trip (`POST /api/trips`).
2. Backend dispatch engine selects candidate driver and creates `trip_offers`.
3. Driver app subscribes to offer and accepts/declines.
4. Backend applies optimistic lock on accept (`status=dispatching` precondition).
5. Driver sends status updates + location pings.
6. Rider subscribes to trip updates and driver location.

## Security boundaries
- Clients use Supabase anon/publishable keys.
- Backend uses service role key for privileged writes.
- Admin endpoints require admin JWT.
- Trip ownership enforced by backend and RLS.
