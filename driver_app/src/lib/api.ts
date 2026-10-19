/**
 * Wasel Driver API client.
 * Wraps fetch with auth token injection and base URL.
 */

// In dev: use empty string so Vite proxy forwards /api/* to the backend.
// In production: use the env var.
const BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');

function getToken(): string | null {
  return localStorage.getItem('wasel_driver_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  sendOtp: (phone: string) =>
    request<{ ok: boolean; phone: string }>('POST', '/api/auth/send-otp', { phone }),

  verifyOtp: (phone: string, token: string) =>
    request<{
      session: { access_token: string; refresh_token: string; expires_in: number };
      user: { id: string; phone: string; role: string };
    }>('POST', '/api/auth/verify', { phone, token, role: 'driver' }),

  logout: () => request<{ ok: boolean }>('POST', '/api/auth/logout'),

  // ── Driver profile ────────────────────────────────────────────────────────
  getDriver: (id: string) => request<Record<string, unknown>>('GET', `/api/drivers/${id}`),

  updateLocation: (id: string, lat: number, lng: number) =>
    request<{ ok: boolean }>('PATCH', `/api/drivers/${id}/location`, { lat, lng }),

  updateLocationWithTrip: (id: string, lat: number, lng: number, tripId?: string) =>
    request<{ ok: boolean }>('PATCH', `/api/drivers/${id}/location`, { lat, lng, tripId }),

  setOnlineStatus: (id: string, isOnline: boolean, isAvailable: boolean) =>
    request<{ ok: boolean }>('PATCH', `/api/drivers/${id}/status`, { isOnline, isAvailable }),

  // ── Trips ─────────────────────────────────────────────────────────────────
  acceptTrip: (tripId: string, offerId?: string) =>
    request<{ ok: boolean; trip: Record<string, unknown> }>('POST', `/api/trips/${tripId}/accept`, {
      offerId,
    }),

  declineTrip: (tripId: string, offerId?: string) =>
    request<{ ok: boolean }>('POST', `/api/trips/${tripId}/decline`, { offerId }),

  updateTripStatus: (tripId: string, status: string) =>
    request<Record<string, unknown>>('PATCH', `/api/trips/${tripId}/status`, { status }),

  cancelTrip: (tripId: string, reason: string) =>
    request<{ ok: boolean; trip: Record<string, unknown> }>('POST', `/api/trips/${tripId}/cancel`, { reason }),

  getMyTrips: () => request<Record<string, unknown>[]>('GET', '/api/trips'),

  getTripById: (tripId: string) =>
    request<Record<string, unknown>>('GET', `/api/trips/${tripId}`),

  getDriverTrips: (driverId: string) =>
    request<Record<string, unknown>[]>('GET', `/api/drivers/${driverId}/trips`),

  getPendingOffers: (driverId: string) =>
    request<Record<string, unknown>[]>('GET', `/api/drivers/${driverId}/offers/pending`),

  getDriverEarnings: (driverId: string) =>
    request<{ totalTrips: number; totalEarnings: number; thisWeekEarnings: number }>('GET', `/api/drivers/${driverId}/earnings`),

  updateDriver: (id: string, fields: { name?: string; subscriptionTier?: number }) => {
    const body: Record<string, unknown> = {};
    if (fields.name !== undefined)             body.name = fields.name;
    if (fields.subscriptionTier !== undefined) body.subscription_tier = fields.subscriptionTier;
    return request<Record<string, unknown>>('PATCH', `/api/drivers/${id}`, body);
  },

  refreshToken: (refreshToken: string) =>
    request<{ access_token: string; refresh_token: string; expires_in: number }>(
      'POST', '/api/auth/refresh', { refreshToken }
    ),
};
