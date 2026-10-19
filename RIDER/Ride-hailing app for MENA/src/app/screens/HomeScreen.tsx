import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, Polyline, Circle } from '@react-google-maps/api';
import {
  Search, MapPin, X, ChevronRight, Star, Phone, MessageSquare,
  Navigation, Clock, AlertTriangle, CheckCircle,
  Car, Zap, ArrowLeft, Home, Briefcase, Heart, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  AMMAN_CENTER, AMMAN_PLACES, DRIVERS, RIDE_TIERS, Place,
  calculateFare, formatFare,
} from '../data/mockData';
import {
  mapsApiKey, AMMAN_CENTER as MAPS_AMMAN_CENTER, DARK_MAP_STYLE, LIGHT_MAP_STYLE, MAP_OPTIONS_BASE,
} from '../config/maps';

// Must be stable (outside component) to avoid re-loading the Maps API on every render
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

// ── Marker SVG helpers (defined as functions — google global only available after Maps loads) ──

function getPickupMarkerIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: '#60A5FA',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  };
}

function getDestMarkerIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: '#D4A843',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  };
}

function getDriverMarkerIcon(rotation = 0): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 7,
    fillColor: '#D4A843',
    fillOpacity: 1,
    strokeColor: '#111111',
    strokeWeight: 2,
    rotation,
  };
}

// ── Types ───────────────────────────────────────────────────────────────────

type BookingStage =
  | 'idle'
  | 'destination_search'
  | 'select_tier'
  | 'confirming'
  | 'finding_driver'
  | 'driver_matched'
  | 'driver_arriving'
  | 'in_progress'
  | 'completed'
  | 'rating';

type SearchMode = 'pickup' | 'destination';

interface HomeScreenProps {
  onRideHere?: (place: Place) => void;
  pendingDestination?: Place | null;
  onPendingConsumed?: () => void;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const sheet: React.CSSProperties = {
  background: 'var(--bg-sheet)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  borderTop: '1px solid var(--border)',
  boxShadow: '0 -24px 80px rgba(0,0,0,0.8)',
};

const dragHandle: React.CSSProperties = {
  width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 99,
  margin: '0 auto 12px',
};

const glassCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
};

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

function isValidPlace(place: Place | null | undefined): place is Place {
  return !!place
    && Array.isArray(place.coords)
    && place.coords.length === 2
    && Number.isFinite(place.coords[0])
    && Number.isFinite(place.coords[1]);
}

function getPlaceName(place: Place, lang: 'en' | 'ar'): string {
  return lang === 'ar' ? place.nameAr : place.nameEn;
}

function getPlaceAddress(place: Place, lang: 'en' | 'ar'): string {
  return lang === 'ar' ? place.addressAr : place.addressEn;
}

function savedPlaceToPlace(
  saved: { lat: number; lng: number; label: string; address?: string } | null | undefined,
  id: string,
  fallbackNameEn: string,
  fallbackNameAr: string,
): Place | null {
  if (!saved || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng) || !saved.label.trim()) {
    return null;
  }
  return {
    id,
    nameEn: saved.label.trim() || fallbackNameEn,
    nameAr: saved.label.trim() || fallbackNameAr,
    addressEn: saved.address?.trim() || saved.label.trim() || fallbackNameEn,
    addressAr: saved.address?.trim() || saved.label.trim() || fallbackNameAr,
    coords: [saved.lat, saved.lng],
    type: 'area',
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export function HomeScreen({ onRideHere, pendingDestination, onPendingConsumed }: HomeScreenProps) {
  const { t, lang, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { session, updateProfile } = useAuth();
  const fontFamily = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';
  const currentLocationLabel = t('currentLocation');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: mapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const isMissingMapsKey = !mapsApiKey;
  const bottomDockOffset = 'calc(64px + var(--wasel-safe-bottom, 0px))';

  // ── Core state (must come before any useEffect that references these) ─────
  const [stage, setStage] = useState<BookingStage>('idle');
  const [searchMode, setSearchMode] = useState<SearchMode>('destination');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierId, setSelectedTierId] = useState<'normal' | 'comfort'>('normal');
  const [pickupLocation, setPickupLocation] = useState<[number, number]>(AMMAN_CENTER);
  const [pickupLabel, setPickupLabel] = useState(currentLocationLabel);
  const [pickupAddress, setPickupAddress] = useState(currentLocationLabel);
  const [hasCustomPickup, setHasCustomPickup] = useState(false);
  const [destinationPlace, setDestinationPlace] = useState<Place | null>(null);
  const [assignedDriver, setAssignedDriver] = useState(DRIVERS[0]);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [etaSeconds, setEtaSeconds] = useState(180);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);
  const [savedPlaceNotice, setSavedPlaceNotice] = useState<string | null>(null);
  const [driverLiveLocation, setDriverLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(MAPS_AMMAN_CENTER);
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const initialPickupRequestedRef = useRef(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
  }), [session?.accessToken]);

  const syncDriverLocation = useCallback(async (driverId: string) => {
    if (!driverId) return;
    const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');
    try {
      const res = await fetch(`${API_URL}/api/drivers/${driverId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const raw = await res.json() as Record<string, unknown>;
      const lat = Number(raw.lat);
      const lng = Number(raw.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setDriverLiveLocation({ lat, lng });
      }
    } catch {
      // best effort driver location sync only
    }
  }, [authHeaders]);

  const hydrateAssignedDriver = useCallback(async (driverId: string) => {
    if (!driverId) return;
    const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');
    try {
      const res = await fetch(`${API_URL}/api/drivers/${driverId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const raw = await res.json() as Record<string, unknown>;
      setAssignedDriver(prev => ({
        ...prev,
        id: String(raw.id ?? driverId),
        nameEn: String(raw.name ?? prev.nameEn),
        nameAr: String(raw.name ?? prev.nameAr),
        rating: Number(raw.rating ?? prev.rating),
        carModel: raw.car_make || raw.car_model
          ? `${String(raw.car_make ?? '').trim()} ${String(raw.car_model ?? '').trim()}`.trim()
          : prev.carModel,
        carColor: String(raw.car_color ?? prev.carColor),
        licensePlate: String(raw.car_plate ?? prev.licensePlate),
      }));
    } catch {
      // best effort driver hydration only
    }
  }, [authHeaders]);

  // ── Google Places Autocomplete ─────────────────────────────────────────
  const [placeSuggestions, setPlaceSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const openPlaceSearch = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    setSearchQuery('');
    setStage('destination_search');
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const applyCurrentPickup = useCallback((lat: number, lng: number) => {
    setPickupLocation([lat, lng]);
    setPickupLabel(currentLocationLabel);
    setPickupAddress(currentLocationLabel);
    setHasCustomPickup(false);
    setMapCenter({ lat, lng });
    setLocationError(null);
  }, [currentLocationLabel]);

  const requestCurrentPickup = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(isRTL ? 'الموقع الحالي غير مدعوم على هذا الجهاز.' : 'Current location is not supported on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
          setLocationError(isRTL ? 'تعذر قراءة موقعك الحالي.' : 'Could not read your current location.');
          return;
        }
        applyCurrentPickup(coords.latitude, coords.longitude);
      },
      () => {
        setLocationError(
          isRTL
            ? 'استخدم الخريطة أو المواقع المحفوظة لاختيار نقطة الالتقاط.'
            : 'Use the map or saved places to choose your pickup point.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [applyCurrentPickup, isRTL]);

  const applyManualPickup = useCallback((lat: number, lng: number, label: string, address = label) => {
    setPickupLocation([lat, lng]);
    setPickupLabel(label);
    setPickupAddress(address);
    setHasCustomPickup(true);
    setMapCenter({ lat, lng });
    setLocationError(null);
  }, []);

  const reverseGeocodePickup = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return;
      const firstLine = results[0].address_components?.[0]?.long_name;
      setPickupLabel(firstLine || (lang === 'ar' ? 'نقطة الالتقاط المحددة' : 'Pinned pickup'));
      setPickupAddress(results[0].formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    });
  }, [lang]);

  // Initialise services once Maps has loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Fetch suggestions whenever the query changes
  useEffect(() => {
    if (!autocompleteServiceRef.current || !searchQuery.trim()) {
      setPlaceSuggestions([]);
      return;
    }
    setIsFetchingSuggestions(true);
    const timeout = setTimeout(() => {
      autocompleteServiceRef.current!.getPlacePredictions(
        {
          input: searchQuery,
          componentRestrictions: { country: 'jo' },
          location: new google.maps.LatLng(AMMAN_CENTER[0], AMMAN_CENTER[1]),
          radius: 30_000,
        },
        (predictions, status) => {
          setIsFetchingSuggestions(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPlaceSuggestions(predictions);
          } else {
            setPlaceSuggestions([]);
          }
        }
      );
    }, 250); // debounce 250ms
    return () => clearTimeout(timeout);
  }, [searchQuery, isLoaded]);

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        const syntheticPlace: Place = {
          id: prediction.place_id,
          nameEn: prediction.structured_formatting.main_text,
          nameAr: prediction.structured_formatting.main_text,
          addressEn: prediction.structured_formatting.secondary_text ?? '',
          addressAr: prediction.structured_formatting.secondary_text ?? '',
          coords: [loc.lat(), loc.lng()],
          type: 'landmark',
        };
        setPlaceSuggestions([]);
        handleSelectPlace(syntheticPlace);
      }
    });
  };

  const selectedTier = RIDE_TIERS.find(t => t.id === selectedTierId)!;
  const savedHomePlace = savedPlaceToPlace(
    session?.savedHome,
    'saved-home',
    'Home',
    'المنزل',
  );
  const savedWorkPlace = savedPlaceToPlace(
    session?.savedWork,
    'saved-work',
    'Work',
    'العمل',
  );
  const searchablePlaces = [
    ...(savedHomePlace ? [savedHomePlace] : []),
    ...(savedWorkPlace ? [savedWorkPlace] : []),
    ...AMMAN_PLACES,
  ];
  const estimatedDistanceKm = destinationPlace
    ? Math.sqrt(
        Math.pow((destinationPlace.coords[0] - pickupLocation[0]) * 111, 2) +
        Math.pow((destinationPlace.coords[1] - pickupLocation[1]) * 111 * Math.cos(pickupLocation[0] * Math.PI / 180), 2)
      )
    : 5;
  const estimatedDurationMin = Math.round(estimatedDistanceKm * 3.5);
  const estimatedFare = calculateFare(selectedTier, estimatedDistanceKm, estimatedDurationMin);

  const filteredPlaces = searchablePlaces.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.nameEn.toLowerCase().includes(q) ||
      p.nameAr.includes(searchQuery) ||
      p.addressEn.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!pendingDestination) return;
    if (!isValidPlace(pendingDestination)) {
      setTripError(isRTL ? 'الموقع المحفوظ غير صالح.' : 'The saved place is invalid.');
      onPendingConsumed?.();
      return;
    }
    setDestinationPlace(pendingDestination);
    setStage('select_tier');
    setMapCenter({ lat: pendingDestination.coords[0], lng: pendingDestination.coords[1] });
    onPendingConsumed?.();
  }, [pendingDestination, isRTL, onPendingConsumed]);

  useEffect(() => {
    if (!hasCustomPickup) {
      setPickupLabel(currentLocationLabel);
      setPickupAddress(currentLocationLabel);
    }
  }, [currentLocationLabel, hasCustomPickup]);

  useEffect(() => {
    if (hasCustomPickup) return;
    if (initialPickupRequestedRef.current) return;
    initialPickupRequestedRef.current = true;
    requestCurrentPickup();
  }, [hasCustomPickup, requestCurrentPickup]);

  useEffect(() => {
    if (!savedPlaceNotice) return;
    const timeout = window.setTimeout(() => setSavedPlaceNotice(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [savedPlaceNotice]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    if (isValidPlace(destinationPlace)) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickupLocation[0], lng: pickupLocation[1] });
      bounds.extend({ lat: destinationPlace.coords[0], lng: destinationPlace.coords[1] });
      mapRef.current.fitBounds(bounds, 80);
      return;
    }

    mapRef.current.panTo({ lat: pickupLocation[0], lng: pickupLocation[1] });
  }, [isLoaded, pickupLocation, destinationPlace]);

  useEffect(() => {
    if (stage === 'driver_arriving' && etaSeconds > 0) {
      const id = setInterval(() => setEtaSeconds(s => s - 1), 1000);
      return () => clearInterval(id);
    }
  }, [stage, etaSeconds]);

  useEffect(() => {
    if (stage === 'in_progress') {
      const id = setInterval(() => setTripSeconds(s => s + 1), 1000);
      return () => clearInterval(id);
    }
  }, [stage]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSearchFocus = () => openPlaceSearch('destination');

  const handleSavePickupPlace = async (slot: 'savedHome' | 'savedWork') => {
    const payload = {
      lat: pickupLocation[0],
      lng: pickupLocation[1],
      label: pickupLabel,
      address: pickupAddress,
    };

    await updateProfile(
      slot === 'savedHome'
        ? { savedHome: payload }
        : { savedWork: payload }
    );
    setSavedPlaceNotice(
      slot === 'savedHome'
        ? (isRTL ? 'تم حفظ موقع المنزل.' : 'Home place saved.')
        : (isRTL ? 'تم حفظ موقع العمل.' : 'Work place saved.')
    );
  };

  const handleSelectPlace = (place: Place, mode: SearchMode = searchMode) => {
    if (!isValidPlace(place)) {
      setTripError(isRTL ? 'تعذر فتح هذا الموقع.' : 'Could not open that place.');
      return;
    }
    setSearchQuery('');
    if (mode === 'pickup') {
      applyManualPickup(
        place.coords[0],
        place.coords[1],
        getPlaceName(place, lang),
        getPlaceAddress(place, lang)
      );
      setStage(destinationPlace ? 'select_tier' : 'idle');
      return;
    }
    setDestinationPlace(place);
    setStage('select_tier');
    setMapCenter({ lat: place.coords[0], lng: place.coords[1] });
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || (stage !== 'idle' && !(stage === 'destination_search' && searchMode === 'pickup'))) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    applyManualPickup(
      lat,
      lng,
      lang === 'ar' ? 'نقطة الالتقاط المحددة' : 'Pinned pickup',
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
    reverseGeocodePickup(lat, lng);
    if (stage === 'destination_search' && searchMode === 'pickup') {
      setSearchQuery('');
      setStage(destinationPlace ? 'select_tier' : 'idle');
    }
  }, [applyManualPickup, destinationPlace, lang, reverseGeocodePickup, searchMode, stage]);

  const handleBookRide = () => setStage('confirming');

  const handleConfirmRide = async () => {
    setStage('finding_driver');
    setTripError(null);

    const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');

    try {
      const res = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          riderId:            session?.riderId ?? 'anonymous',
          pickup:             { lat: pickupLocation[0], lng: pickupLocation[1] },
          destination:        { lat: destinationPlace?.coords[0] ?? pickupLocation[0], lng: destinationPlace?.coords[1] ?? pickupLocation[1] },
          pickupAddress:      pickupAddress,
          destinationAddress: isValidPlace(destinationPlace) ? getPlaceAddress(destinationPlace, lang) : (isRTL ? 'الوجهة' : 'Destination'),
          tier:               selectedTierId,
          paymentMethod:      'cash',
        }),
      });

      if (res.ok) {
        const data = await res.json() as { tripId: string };
        setActiveTripId(data.tripId);

        // Poll for driver assignment every 2 seconds (max 90s)
        let elapsed = 0;
        pollingRef.current = setInterval(async () => {
          elapsed += 2;
          if (elapsed > 90) {
            clearInterval(pollingRef.current!);
            setStage('idle');
            setTripError('No drivers available right now. Please try again.');
            return;
          }
          try {
            const tripRes = await fetch(`${API_URL}/api/trips/${data.tripId}`, { headers: authHeaders() });
            if (!tripRes.ok) return;
            const trip = await tripRes.json() as Record<string, unknown>;

            if (['dispatching', 'accepted'].includes(String(trip.status))) {
              clearInterval(pollingRef.current!);
              // Use a placeholder driver with real id — UI shows name from driver profile
              const fallback = { ...DRIVERS[0], id: String(trip.driver_id ?? DRIVERS[0].id) };
              setAssignedDriver(fallback);
              await hydrateAssignedDriver(String(trip.driver_id ?? ''));
              await syncDriverLocation(String(trip.driver_id ?? ''));
              setStage('driver_matched');
            } else if (['no_driver_found', 'cancelled'].includes(String(trip.status))) {
              clearInterval(pollingRef.current!);
              setStage('idle');
              setTripError('No drivers available right now. Please try again.');
            }
          } catch { /* ignore transient network errors */ }
        }, 2000);
        return;
      }
      const body = await res.json().catch(() => ({}));
      setStage('idle');
      setTripError(String((body as Record<string, unknown>).error ?? 'Ride request failed. Please try again.'));
      return;
    } catch {
      setStage('idle');
      setTripError('Ride request failed. Please check your connection and try again.');
    }
  };

  const applyTripStatus = useCallback((next: Record<string, unknown>) => {
    const status = String(next.status ?? '');
    const driverId = String(next.driver_id ?? '');
    if (status === 'accepted') {
      setStage('driver_matched');
      hydrateAssignedDriver(driverId);
    }
    if (status === 'en_route' || status === 'arrived') setStage('driver_arriving');
    if (status === 'in_progress') setStage('in_progress');
    if (status === 'completed') setStage('completed');
    if (driverId) {
      void syncDriverLocation(driverId);
    }
    if (status === 'cancelled' || status === 'no_driver_found') {
      setStage('idle');
      setTripError('No drivers available right now. Please try again.');
    }
  }, [hydrateAssignedDriver, syncDriverLocation]);

  useEffect(() => {
    if (!activeTripId || !supabase || !session) return;

    const tripChannel = supabase
      .channel(`rider-trip-${activeTripId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${activeTripId}`,
      }, (payload) => {
        const next = payload.new as Record<string, unknown>;
        applyTripStatus(next);
      })
      .subscribe();

    const locChannel = supabase
      .channel(`rider-driver-loc-${activeTripId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'driver_locations',
        filter: `trip_id=eq.${activeTripId}`,
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const lat = Number(row.lat);
        const lng = Number(row.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setDriverLiveLocation({ lat, lng });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tripChannel);
      supabase.removeChannel(locChannel);
    };
  }, [activeTripId, session, hydrateAssignedDriver, applyTripStatus]);

  // Polling fallback if realtime is delayed/misconfigured.
  useEffect(() => {
    if (!activeTripId || !session) return;
    const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');
    const run = async () => {
      try {
        const tripRes = await fetch(`${API_URL}/api/trips/${activeTripId}`, { headers: authHeaders() });
        if (!tripRes.ok) return;
        const trip = await tripRes.json() as Record<string, unknown>;
        applyTripStatus(trip);
        if (trip.driver_id) {
          await syncDriverLocation(String(trip.driver_id));
        }
      } catch {
        // ignore transient polling errors
      }
    };
    const id = setInterval(run, 4000);
    return () => clearInterval(id);
  }, [activeTripId, session, authHeaders, applyTripStatus, syncDriverLocation]);

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  const handleFinishRating = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setActiveTripId(null);
    setDriverLiveLocation(null);
    setTripError(null);
    setStage('idle');
    setDestinationPlace(null);
    setRating(0);
    setRatingComment('');
    setTripSeconds(0);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const bottomSheetVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
  };

  const tierIcons: Record<'normal' | 'comfort', React.ReactNode> = {
    normal: <Car size={20} />,
    comfort: <Zap size={20} />,
  };
  const tierColors: Record<'normal' | 'comfort', string> = {
    normal: '#60A5FA',
    comfort: '#34D399',
  };

  // Derived Google Maps positions
  const pickupLatLng = { lat: pickupLocation[0], lng: pickupLocation[1] };
  const destLatLng = destinationPlace
    ? { lat: destinationPlace.coords[0], lng: destinationPlace.coords[1] }
    : null;
  const driverLatLng = (stage === 'driver_arriving' || stage === 'in_progress')
    ? driverLiveLocation
    : null;

  const handleCancelRide = async () => {
    if (!activeTripId) {
      setStage('idle');
      setDestinationPlace(null);
      return;
    }
    const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');
    try {
      await fetch(`${API_URL}/api/trips/${activeTripId}/cancel`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: 'Rider cancelled before pickup' }),
      });
    } catch {
      // best effort
    }
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStage('idle');
    setDestinationPlace(null);
    setActiveTripId(null);
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ fontFamily }}>
      {/* Google Map */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {loadError && (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: '#0a0a0f', gap: 12 }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(212,168,67,0.10)',
              border: '1px solid rgba(212,168,67,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={22} color="#D4A843" />
            </div>
            <div style={{ fontFamily, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.80)' }}>
              {isRTL ? 'الخريطة غير متاحة' : 'Map unavailable'}
            </div>
            <div style={{
              fontFamily, fontSize: 12, color: 'rgba(255,255,255,0.35)',
              textAlign: 'center', maxWidth: 240, lineHeight: 1.6,
            }}>
              {isMissingMapsKey
                ? (isRTL
                    ? 'مفتاح Google Maps غير مضبوط. أضف VITE_GOOGLE_MAPS_KEY أو VITE_GOOGLE_MAPS_API_KEY.'
                    : 'Google Maps key is missing. Set VITE_GOOGLE_MAPS_KEY or VITE_GOOGLE_MAPS_API_KEY.')
                : (isRTL
                    ? 'يمكنك إدخال الوجهة يدوياً من مربع البحث أدناه'
                    : 'You can still enter your destination below to request a ride')}
            </div>
          </div>
        )}
        {!isLoaded && !loadError && (
          <div className="w-full h-full" style={{ background: '#0a0a0f' }} />
        )}
        {isLoaded && !loadError && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={13}
            options={{ ...MAP_OPTIONS_BASE, styles: theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE }}
            onClick={handleMapClick}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
          >
            {/* Pickup marker */}
            <Marker position={pickupLatLng} icon={getPickupMarkerIcon()} />

            {/* Destination marker */}
            {destLatLng && (
              <Marker position={destLatLng} icon={getDestMarkerIcon()} />
            )}

            {/* Route polyline */}
            {destLatLng && stage !== 'idle' && stage !== 'destination_search' && (
              <Polyline
                path={[pickupLatLng, destLatLng]}
                options={{
                  strokeColor: '#D4A843',
                  strokeWeight: 2.5,
                  strokeOpacity: 0.7,
                  icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
                    offset: '0',
                    repeat: '16px',
                  }],
                }}
              />
            )}

            {/* Driver marker */}
            {driverLatLng && (
              <Marker position={driverLatLng} icon={getDriverMarkerIcon()} />
            )}

            {/* Service zone circle */}
            <Circle
              center={MAPS_AMMAN_CENTER}
              radius={500}
              options={{
                strokeColor: '#D4A843',
                strokeOpacity: 0.25,
                strokeWeight: 1,
                fillColor: '#D4A843',
                fillOpacity: 0.03,
              }}
            />
          </GoogleMap>
        )}
      </div>

      {/* Top bar */}
      {(stage === 'idle' || stage === 'destination_search') && (
        <div
          className="absolute top-0 left-0 right-0 flex flex-col gap-2 px-4"
          style={{ paddingTop: 'calc(var(--wasel-safe-top, 0px) + 12px)', zIndex: 10 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(0,0,0,0.88)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  width: 38, height: 38,
                }}
              >
                <span style={{ color: '#D4A843', fontWeight: 900, fontSize: 18, fontFamily: "'Tajawal', 'Cairo', sans-serif", direction: 'rtl' }} lang="ar">واصل</span>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: 15, fontFamily, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                  {t('appName')}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9.5, fontFamily }}>Amman, Jordan</div>
              </div>
            </div>
            <div
              className="rounded-full overflow-hidden flex items-center justify-center"
              style={{
                width: 38, height: 38,
                background: 'rgba(0,0,0,0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ fontSize: 20 }}>👤</span>
            </div>
          </div>

          <div
            className="rounded-2xl flex items-center gap-3 px-4 cursor-text"
            style={{
              background: 'var(--bg-input)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              height: 52,
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          onClick={handleSearchFocus}
          >
            <Search size={17} style={{ color: '#D4A843', flexShrink: 0 }} />
            {stage === 'destination_search' ? (
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={searchMode === 'pickup'
                  ? (lang === 'ar' ? 'ابحث عن نقطة الالتقاط' : 'Search pickup location')
                  : t('searchDestination')}
                className="flex-1 outline-none bg-transparent"
                style={{ fontFamily, fontSize: 14, color: 'var(--text-primary)' }}
                autoFocus
              />
            ) : (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 14, fontFamily }}>{t('whereTo')}</span>
            )}
            {stage === 'destination_search' && (
              <button onClick={() => { setStage('idle'); setSearchQuery(''); }}>
                <X size={15} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Back button */}
      {['select_tier', 'confirming'].includes(stage) && (
        <button
          onClick={() => {
            if (stage === 'select_tier') {
              setSearchMode('destination');
              setStage('destination_search');
              return;
            }
            setStage('select_tier');
          }}
          className="absolute rounded-full flex items-center justify-center"
          style={{
            top: 'calc(var(--wasel-safe-top, 0px) + 16px)',
            left: isRTL ? 'auto' : 16,
            right: isRTL ? 16 : 'auto',
            width: 40, height: 40,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            zIndex: 10,
          }}
        >
          {isRTL ? <ChevronRight size={20} color="rgba(255,255,255,0.8)" /> : <ArrowLeft size={20} color="rgba(255,255,255,0.8)" />}
        </button>
      )}

      {/* ===== BOTTOM SHEETS ===== */}
      <AnimatePresence mode="wait">

        {/* Idle */}
        {stage === 'idle' && (
          <motion.div key="idle" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              {locationError && (
                <div
                  className="rounded-xl px-3 py-2.5 mb-3"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontFamily, fontSize: 12.5 }}
                >
                  {locationError}
                </div>
              )}
              <div
                className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 mb-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="min-w-0">
                  <div style={{ fontFamily, fontSize: 10.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {t('pickup')}
                  </div>
                  <div className="truncate" style={{ fontFamily, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {pickupLabel}
                  </div>
                  <div className="truncate" style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    {pickupAddress}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasCustomPickup && (
                    <button
                      onClick={requestCurrentPickup}
                      className="rounded-xl px-3 py-2"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontFamily, fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}
                    >
                      {t('currentLocation')}
                    </button>
                  )}
                  <button
                    onClick={() => openPlaceSearch('pickup')}
                    className="rounded-xl px-3 py-2 btn-gold"
                    style={{ fontFamily, fontSize: 11.5, fontWeight: 700 }}
                  >
                    {hasCustomPickup ? t('changePickup') : t('setPickup')}
                  </button>
                </div>
              </div>
              <p style={{ fontFamily, fontWeight: 600, color: 'var(--text-primary)', fontSize: 15, marginBottom: 14 }}>
                {getGreeting()}{session?.name ? `, ${session.name.split(' ')[0]}` : ''} 👋
              </p>
              <div className="flex gap-2.5 mb-4">
                {[
                  {
                    icon: <Home size={15} />,
                    label: savedHomePlace ? (lang === 'ar' ? 'المنزل' : 'Home') : (lang === 'ar' ? 'حفظ المنزل' : 'Save Home'),
                    onClick: () => savedHomePlace ? handleSelectPlace(savedHomePlace, 'destination') : void handleSavePickupPlace('savedHome'),
                  },
                  {
                    icon: <Briefcase size={15} />,
                    label: savedWorkPlace ? (lang === 'ar' ? 'العمل' : 'Work') : (lang === 'ar' ? 'حفظ العمل' : 'Save Work'),
                    onClick: () => savedWorkPlace ? handleSelectPlace(savedWorkPlace, 'destination') : void handleSavePickupPlace('savedWork'),
                  },
                  {
                    icon: <Heart size={15} />,
                    label: lang === 'ar' ? 'المحفوظة' : 'Saved',
                    onClick: () => openPlaceSearch('destination'),
                  },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                    <span style={{ fontFamily, fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                  </button>
                ))}
              </div>
              {savedPlaceNotice && (
                <div
                  className="rounded-xl px-3 py-2 mb-4"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)', fontFamily, fontSize: 12, color: '#34D399', fontWeight: 600 }}
                >
                  {savedPlaceNotice}
                </div>
              )}
              <p style={{ fontFamily, fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('popularInAmman')}
              </p>
              <div className="flex flex-col gap-1">
                {AMMAN_PLACES.slice(0, 3).map(place => (
                  <button
                    key={place.id}
                    onClick={() => handleSelectPlace(place, 'destination')}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: 'var(--accent-subtle)', flexShrink: 0 }}>
                      <MapPin size={15} color="var(--accent)" />
                    </div>
                    <div className="flex-1" style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
                      <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lang === 'ar' ? place.nameAr : place.nameEn}
                      </div>
                      <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {lang === 'ar' ? place.addressAr : place.addressEn}
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--text-tertiary)" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Destination search */}
        {stage === 'destination_search' && (
          <motion.div key="search" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10, maxHeight: '60%', overflowY: 'auto' }}
          >
            <div className="px-4 pt-3 pb-4">
              <div style={dragHandle} />
              <div className="flex gap-2 mb-3">
                {([
                  { mode: 'pickup', label: t('pickup') },
                  { mode: 'destination', label: t('destination') },
                ] as const).map(item => {
                  const active = searchMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setSearchMode(item.mode)}
                      className="rounded-full px-3 py-1.5"
                      style={{
                        background: active ? 'var(--accent-subtle)' : 'var(--bg-card)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                        fontFamily,
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#60A5FA' }} />
                <span style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {searchMode === 'pickup'
                    ? (lang === 'ar'
                      ? 'ابحث عن نقطة الالتقاط أو اخترها من الخريطة.'
                      : 'Search for a pickup point or tap the map to pin it.')
                    : `${t('pickup')}: ${pickupLabel}`}
                </span>
              </div>
              {/* Google Places suggestions when user is typing */}
              {searchQuery.trim() && placeSuggestions.length > 0 && placeSuggestions.map(p => (
                <button
                  key={p.place_id}
                  onClick={() => handleSelectPrediction(p)}
                  className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 mb-1"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: 'var(--accent-subtle)', flexShrink: 0 }}>
                    <MapPin size={15} color="var(--accent)" />
                  </div>
                  <div className="flex-1" style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.structured_formatting.main_text}
                    </div>
                    <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {p.structured_formatting.secondary_text}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-tertiary)" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </button>
              ))}

              {/* Fetching indicator */}
              {searchQuery.trim() && isFetchingSuggestions && (
                <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                  Searching…
                </div>
              )}

              {/* No results + fallback to mock places */}
              {searchQuery.trim() && !isFetchingSuggestions && placeSuggestions.length === 0 && filteredPlaces.map(place => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 mb-1"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: 'var(--accent-subtle)', flexShrink: 0 }}>
                    <MapPin size={15} color="var(--accent)" />
                  </div>
                  <div className="flex-1" style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
                    <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {lang === 'ar' ? place.nameAr : place.nameEn}
                    </div>
                    <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {lang === 'ar' ? place.addressAr : place.addressEn}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-tertiary)" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </button>
              ))}

              {/* Default list when no query */}
              {!searchQuery.trim() && searchablePlaces.map(place => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 mb-1"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: 'var(--accent-subtle)', flexShrink: 0 }}>
                    <MapPin size={15} color="var(--accent)" />
                  </div>
                  <div className="flex-1" style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
                    <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {lang === 'ar' ? place.nameAr : place.nameEn}
                    </div>
                    <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {lang === 'ar' ? place.addressAr : place.addressEn}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-tertiary)" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Select tier */}
        {stage === 'select_tier' && (
          <motion.div key="tier" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#60A5FA' }} />
                  <div className="w-0.5 rounded" style={{ height: 14, background: 'var(--border-strong)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#D4A843' }} />
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)' }}>{pickupLabel}</div>
                  <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {destinationPlace ? (lang === 'ar' ? destinationPlace.nameAr : destinationPlace.nameEn) : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{formatFare(estimatedDistanceKm)} km</div>
                  <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{estimatedDurationMin} min</div>
                </div>
              </div>

              {RIDE_TIERS.map(tier => {
                const fare = calculateFare(tier, estimatedDistanceKm, estimatedDurationMin);
                const isSelected = tier.id === selectedTierId;
                const descKey = (tier.id + 'Desc') as 'normalDesc' | 'comfortDesc';
                const color = tierColors[tier.id];
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 mb-2"
                    style={{
                      border: `1.5px solid ${isSelected ? color : 'var(--border)'}`,
                      background: isSelected ? `${color}12` : 'var(--bg-card)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      className="rounded-xl flex items-center justify-center"
                      style={{ width: 40, height: 40, background: `${color}18`, flexShrink: 0 }}
                    >
                      <span style={{ color }}>{tierIcons[tier.id]}</span>
                    </div>
                    <div className="flex-1" style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
                      <div style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {lang === 'ar' ? tier.labelAr : tier.label}
                      </div>
                      <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {t(descKey)} · {tier.etaMin}–{tier.etaMax} {t('minAway')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontFamily, fontWeight: 700, fontSize: 16, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {formatFare(fare)} {t('jd')}
                      </div>
                      <div style={{ fontFamily, fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {tier.capacity} {t('seats')}
                      </div>
                    </div>
                    {isSelected && <CheckCircle size={16} color={color} />}
                  </button>
                );
              })}

              <div className="flex items-center justify-center mb-3">
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily }}>⚡ {t('noSurge')} · {t('fairPricing')}</span>
              </div>

              <button onClick={handleBookRide} className="w-full rounded-2xl py-4 btn-gold" style={{ fontFamily, fontWeight: 700, fontSize: 16 }}>
                {t('bookNow')} — {formatFare(estimatedFare)} {t('jd')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Confirming */}
        {stage === 'confirming' && (
          <motion.div key="confirm" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <h3 style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 14 }}>
                {t('confirmRide')}
              </h3>
              <div className="rounded-2xl p-4 mb-3" style={glassCard}>
                {[
                  [t('baseFare'), `${selectedTier.baseFare.toFixed(2)} ${t('jd')}`],
                  [`${t('distance')} (${formatFare(estimatedDistanceKm)} km)`, `${(selectedTier.perKm * estimatedDistanceKm).toFixed(2)} ${t('jd')}`],
                  [`${t('duration')} (${estimatedDurationMin} min)`, `${(selectedTier.perMin * estimatedDurationMin).toFixed(2)} ${t('jd')}`],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between items-center mb-2">
                    <span style={{ fontFamily, fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily, fontSize: 12.5, color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
                <div className="border-t pt-2.5 flex justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t('totalFare')}</span>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 19, color: 'var(--accent)' }}>{formatFare(estimatedFare)} {t('jd')}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(212,168,67,0.2)' }}>
                <span style={{ fontSize: 18 }}>💵</span>
                <div className="flex-1">
                  <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{t('paymentMethod')}</div>
                  <div style={{ fontFamily, fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t('cashPayment')} · {t('cashDefault')}</div>
                </div>
                <ChevronDown size={15} color="var(--text-tertiary)" />
              </div>
              <button onClick={handleConfirmRide} className="w-full rounded-2xl py-4 btn-gold" style={{ fontFamily, fontWeight: 700, fontSize: 16 }}>
                {t('confirmRide')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Finding driver */}
        {stage === 'finding_driver' && (
          <motion.div key="finding" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-8 flex flex-col items-center">
              <div style={dragHandle} />
              <div className="relative flex items-center justify-center mb-5" style={{ width: 100, height: 100 }}>
                <div className="absolute rounded-full glow-ring" style={{ border: '2px solid rgba(212,168,67,0.5)', width: 100, height: 100 }} />
                <div className="absolute rounded-full glow-ring-delay" style={{ border: '2px solid rgba(212,168,67,0.35)', width: 72, height: 72 }} />
                <div className="absolute rounded-full glow-ring-delay2" style={{ border: '2px solid rgba(212,168,67,0.2)', width: 48, height: 48 }} />
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #1B3A5C, #0B1526)', border: '2px solid rgba(212,168,67,0.4)', zIndex: 1 }}
                >
                  <Car size={24} color="#D4A843" />
                </div>
              </div>
              <h3 style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 6 }}>
                {t('findingDriver')}
              </h3>
              <p style={{ fontFamily, fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                {t('searchingNearby')}
              </p>
              {activeTripId && (
                <p style={{ fontFamily, fontSize: 11, color: 'rgba(212,168,67,0.6)', marginTop: 8, textAlign: 'center' }}>
                  Trip #{activeTripId.slice(0, 8)} · Contacting nearest driver…
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Trip error banner */}
        {tripError && stage === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute left-4 right-4 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              bottom: 'calc(84px + var(--wasel-safe-bottom, 0px))',
              zIndex: 20,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.3)',
            }}
          >
            <AlertTriangle size={16} color="#F87171" />
            <span style={{ fontFamily, fontSize: 13, color: '#F87171', flex: 1 }}>{tripError}</span>
            <button onClick={() => setTripError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: 18, lineHeight: 1 }}>×</button>
          </motion.div>
        )}

        {/* Driver matched */}
        {stage === 'driver_matched' && (
          <motion.div key="matched" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-full flex items-center justify-center" style={{ width: 24, height: 24, background: 'rgba(52,211,153,0.15)' }}>
                  <CheckCircle size={14} color="#34D399" />
                </div>
                <h3 style={{ fontFamily, fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{t('driverMatched')}</h3>
              </div>
              <div className="flex items-center gap-4 rounded-2xl p-4 mb-3" style={glassCard}>
                <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ width: 64, height: 64, background: 'var(--bg-input)' }}>
                  <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily, fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? assignedDriver.nameAr : assignedDriver.nameEn}
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <Star size={12} fill="#D4A843" color="#D4A843" />
                    <span style={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{assignedDriver.rating}</span>
                    <span style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>· {assignedDriver.totalTrips} {t('trips')}</span>
                  </div>
                  <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {assignedDriver.carModel} · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{assignedDriver.licensePlate}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ fontFamily, fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>{assignedDriver.etaMinutes}</div>
                  <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{t('minAway')}</div>
                </div>
              </div>
              <div className="flex gap-2.5 mb-3">
                <div
                  className="w-full rounded-xl py-3 text-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily, fontSize: 13 }}
                >
                  {lang === 'ar' ? 'بانتظار تحرك السائق إليك...' : 'Waiting for the driver to move toward pickup…'}
                </div>
              </div>
              <div
                className="w-full rounded-2xl py-4 text-center"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', fontFamily, fontWeight: 700, fontSize: 14, border: '1px solid rgba(212,168,67,0.25)' }}
              >
                {lang === 'ar' ? 'سيتم تحديث الحالة تلقائياً عند تحرك السائق' : 'Status updates automatically when driver starts moving'}
              </div>
              <button
                onClick={handleCancelRide}
                className="w-full rounded-2xl py-3 mt-3"
                style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', fontFamily, fontWeight: 600, fontSize: 14, border: '1px solid rgba(248,113,113,0.2)' }}
              >
                {t('cancelRide')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Driver arriving */}
        {stage === 'driver_arriving' && (
          <motion.div key="arriving" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily, fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{t('driverArriving')}</h3>
                <div className="rounded-xl px-3 py-1.5 flex items-center gap-1.5"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(212,168,67,0.25)' }}
                >
                  <Clock size={13} color="var(--accent)" />
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>{formatTime(etaSeconds)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl p-3 mb-4" style={glassCard}>
                <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 48, height: 48, background: 'var(--bg-input)' }}>
                  <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? assignedDriver.nameAr : assignedDriver.nameEn}
                  </div>
                  <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {assignedDriver.carModel} · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{assignedDriver.licensePlate}</span>
                  </div>
                </div>
                <button className="rounded-full flex items-center justify-center"
                  style={{ width: 36, height: 36, background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.25)' }}
                >
                  <Phone size={15} color="#D4A843" />
                </button>
              </div>
              <div className="flex items-center justify-between mb-4 px-2">
                {[t('waitingForDriver'), t('onTheWay'), t('arrived')].map((label, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                    <div className="rounded-full flex items-center justify-center"
                      style={{
                        width: 28, height: 28,
                        background: i === 1 ? '#D4A843' : i === 0 ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                        border: i === 1 ? 'none' : i === 0 ? '1.5px solid #60A5FA' : '1.5px solid var(--border)',
                      }}
                    >
                      {i <= 1 ? <CheckCircle size={13} color={i === 1 ? 'white' : '#60A5FA'} /> : <Clock size={13} color="rgba(255,255,255,0.25)" />}
                    </div>
                    <span style={{ fontFamily, fontSize: 9.5, color: i <= 1 ? 'var(--text-primary)' : 'var(--text-tertiary)', textAlign: 'center' }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCancelRide}
                className="w-full rounded-2xl py-3"
                style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', fontFamily, fontWeight: 600, fontSize: 14, border: '1px solid rgba(248,113,113,0.2)' }}
              >
                {t('cancelRide')}
              </button>
            </div>
          </motion.div>
        )}

        {/* In progress */}
        {stage === 'in_progress' && (
          <motion.div key="inprogress" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <div className="rounded-2xl flex items-center justify-center gap-2 py-2.5 mb-4"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(212,168,67,0.2)' }}
              >
                <Navigation size={15} color="var(--accent)" />
                <span style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t('tripInProgress')}</span>
                <span style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{formatTime(tripSeconds)}</span>
              </div>
              <div className="flex gap-3 mb-3">
                <div className="flex-1 rounded-xl p-3 text-center" style={glassCard}>
                  <div style={{ fontFamily, fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{formatFare(estimatedDistanceKm)}</div>
                  <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>km</div>
                </div>
                <div className="flex-1 rounded-xl p-3 text-center"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 12 }}
                >
                  <div style={{ fontFamily, fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{formatFare(estimatedFare)} {t('jd')}</div>
                  <div style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{t('totalFare')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <MapPin size={13} color="var(--accent)" />
                <span style={{ fontFamily, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {destinationPlace ? (lang === 'ar' ? destinationPlace.nameAr : destinationPlace.nameEn) : '—'}
                </span>
              </div>
              <div
                className="w-full rounded-2xl py-4 text-center"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', fontFamily, fontWeight: 700, fontSize: 15, border: '1px solid rgba(52,211,153,0.25)' }}
              >
                {lang === 'ar' ? 'بانتظار إتمام الرحلة من السائق' : 'Waiting for driver to complete trip'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Completed */}
        {stage === 'completed' && (
          <motion.div key="completed" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <div className="flex items-center gap-2.5 mb-4">
                <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: 'rgba(52,211,153,0.12)' }}>
                  <CheckCircle size={17} color="#34D399" />
                </div>
                <h3 style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{t('tripComplete')}</h3>
              </div>
              <div className="rounded-2xl p-4 mb-4" style={glassCard}>
                {[
                  [t('distance'), `${formatFare(estimatedDistanceKm)} km`],
                  [t('duration'), `${estimatedDurationMin} min`],
                  [lang === 'ar' ? 'نوع الرحلة' : 'Ride Type', lang === 'ar' ? (RIDE_TIERS.find(r => r.id === selectedTierId)?.labelAr ?? selectedTierId) : (RIDE_TIERS.find(r => r.id === selectedTierId)?.label ?? selectedTierId)],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between mb-2">
                    <span style={{ fontFamily, fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily, fontSize: 12.5, color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
                <div className="border-t pt-2.5 flex justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t('totalFare')}</span>
                  <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: 'var(--accent)' }}>{formatFare(estimatedFare)} {t('jd')}</span>
                </div>
              </div>
              <button onClick={() => setStage('rating')} className="w-full rounded-2xl py-4 btn-gold" style={{ fontFamily, fontWeight: 700, fontSize: 16 }}>
                {t('payCash')} & {t('rateDriver')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Rating */}
        {stage === 'rating' && (
          <motion.div key="rating" variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute left-0 right-0 rounded-t-3xl"
            style={{ ...sheet, bottom: bottomDockOffset, zIndex: 10 }}
          >
            <div className="px-4 pt-3 pb-5">
              <div style={dragHandle} />
              <h3 style={{ fontFamily, fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 14 }}>
                {t('rateDriver')}
              </h3>
              <div className="flex items-center gap-3 rounded-2xl p-3 mb-5" style={glassCard}>
                <div className="rounded-xl overflow-hidden" style={{ width: 52, height: 52, background: 'var(--bg-input)', flexShrink: 0 }}>
                  <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div style={{ fontFamily, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? assignedDriver.nameAr : assignedDriver.nameEn}
                  </div>
                  <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{assignedDriver.carModel}</div>
                </div>
              </div>
              <div className="flex justify-center gap-3 mb-5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)}>
                    <motion.div animate={{ scale: star <= rating ? 1.15 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                      <Star size={36} fill={star <= rating ? '#D4A843' : 'none'} color={star <= rating ? '#D4A843' : 'var(--border-strong)'} strokeWidth={1.5} />
                    </motion.div>
                  </button>
                ))}
              </div>
              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                placeholder={t('addComment')}
                className="w-full rounded-xl px-4 py-3 outline-none resize-none"
                style={{
                  fontFamily, fontSize: 13,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  height: 72, marginBottom: 14,
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              />
              <button
                onClick={handleFinishRating}
                disabled={rating === 0}
                className="w-full rounded-2xl py-4"
                style={{
                  background: rating > 0 ? 'linear-gradient(135deg, #D4A843 0%, #E8C060 50%, #D4A843 100%)' : 'var(--bg-input)',
                  color: rating > 0 ? '#111111' : 'var(--text-tertiary)',
                  fontFamily, fontWeight: 700, fontSize: 16,
                  transition: 'all 0.2s',
                }}
              >
                {t('submit')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
