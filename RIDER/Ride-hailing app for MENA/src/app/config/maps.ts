// Wasel Maps Configuration
// Prefer the newer API_KEY env because the repo still carries a legacy key name in .env.
//
// ⚠️  NATIVE BUILD NOTE — Google Maps API key HTTP referrer restrictions:
//   Browser dev server:  http://localhost:5173/*
//   Capacitor iOS/Android native shell:  capacitor://localhost/*
// If the Maps API key has referrer restrictions set in Google Cloud Console,
// you must add "capacitor://localhost/*" as an allowed referrer, otherwise
// the map will silently fail to load inside the native app (403 / REQUEST_DENIED).
const preferredKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
const legacyKey = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string) || '';

export const mapsApiKey: string = preferredKey || legacyKey || '';

export const AMMAN_CENTER: google.maps.LatLngLiteral = {
  lat: 31.9539,
  lng: 35.9106,
};

// ── Dark map style — black base, clearly visible roads ──────────────
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Base — pure black
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#808080' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },

  // Roads — clearly visible silver/grey on black
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#666666' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#222222' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#303030' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3a3a3a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#222222' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#888888' }],
  },

  // Landscape — very dark grey
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#0d0d0d' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#0f0f0f' }],
  },

  // Water — dark
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#050505' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3a3a3a' }],
  },

  // Hide clutter
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Locality labels (Amman neighbourhoods)
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#606060' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#484848' }],
  },
];

// ── Light map style — white base, clean roads ─────────────────────
export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Clean white base
  { elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8f8f8' }] },

  // Roads — clearly visible
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0e0e0' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#888888' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f0ede8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0dcd5' }],
  },

  // Landscape
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f0f0f0' }],
  },

  // Water
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#d0e4f0' }],
  },

  // Hide clutter
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#888888' }],
  },
];

export const MAP_OPTIONS_BASE: Omit<google.maps.MapOptions, 'styles'> = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  zoomControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};
