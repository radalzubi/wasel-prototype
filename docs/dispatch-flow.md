# Dispatch Flow

## BMP scoring (current backend)
Dispatch score combines:
- proximity
- subscription tier
- driver activity quality
- idle time bonus

Highest score receives a pending offer with expiry.

## Offer lifecycle
- `pending` -> `accepted`
- `pending` -> `rejected`
- `pending` -> `expired`

On rejection/expiry, backend triggers re-dispatch to the next candidate.

## Realtime channels
- Driver app listens for `trip_offers` inserts filtered by `driver_id`.
- Rider app listens for `trips` updates filtered by active `trip_id`.
- Rider app listens for `driver_locations` inserts filtered by active `trip_id`.

## Trip lifecycle
`requested -> dispatching -> accepted -> en_route -> arrived -> in_progress -> completed`

Allowed cancellation path:
- from `requested|dispatching|accepted|en_route|arrived` to `cancelled`

Backend rejects invalid transitions with `400`.
