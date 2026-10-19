// Geospatial utilities for the Wasel dispatch engine

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Haversine formula — returns distance in kilometres between two coordinates.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Returns driver IDs within radiusKm of center.
 */
export function driversWithinRadius(
  drivers: Array<{ id: string; location: LatLng }>,
  center: LatLng,
  radiusKm: number
): string[] {
  return drivers
    .filter((d) => haversineKm(d.location, center) <= radiusKm)
    .map((d) => d.id);
}

/**
 * Rough ETA in minutes at average city speed (30 km/h).
 */
export function etaMinutes(from: LatLng, to: LatLng): number {
  const dist = haversineKm(from, to);
  return Math.ceil((dist / 30) * 60);
}
