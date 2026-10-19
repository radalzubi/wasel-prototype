import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { supabase } from './lib/supabase';
import { api } from './lib/api';

import { LoginScreen }        from './screens/LoginScreen';
import { OnboardingScreen }   from './screens/OnboardingScreen';
import { DashboardScreen }    from './screens/DashboardScreen';
import { RideOfferScreen }    from './screens/RideOfferScreen';
import { NavigationScreen }   from './screens/NavigationScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { TripHistoryScreen }  from './screens/TripHistoryScreen';

// ── Types ──────────────────────────────────────────────────────────────────────

type DriverScreen =
  | 'login'
  | 'checking'      // checking driver profile after login
  | 'onboarding'
  | 'dashboard'
  | 'ride_offer'
  | 'navigation'
  | 'subscription'
  | 'history';

interface TripOffer {
  offerId: string;
  tripId: string;
  pickupAddress: string;
  destAddress: string;
  fareJd: number;
  distanceKm: number;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
}

// ── Inner app (has access to AuthContext) ──────────────────────────────────────

function InnerApp() {
  const { session, isLoading } = useAuth();
  const [screen, setScreen] = useState<DriverScreen>('login');
  const [pendingOffer, setPendingOffer] = useState<TripOffer | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripOffer | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [driverTier, setDriverTier] = useState<1 | 2 | 3>(1);
  const lastOfferIdRef = useRef<string | null>(null);
  const isAcceptingRef = useRef(false); // guard against duplicate accept taps
  const wasOnlineRef   = useRef(false); // track driver-chosen online state

  const hydrateOffer = useCallback(async (offer: Record<string, unknown>) => {
    const offerId = String(offer.id ?? '');
    if (!offerId || offerId === lastOfferIdRef.current) return;
    if (new Date(String(offer.expires_at ?? 0)) < new Date()) return;
    try {
      const matched = await api.getTripById(String(offer.trip_id));
      const tripOffer: TripOffer = {
        offerId,
        tripId: String(offer.trip_id),
        pickupAddress: String(matched?.pickup_address ?? 'Pickup location'),
        destAddress: String(matched?.dest_address ?? 'Destination'),
        fareJd: Number(matched?.fare_jd ?? 0),
        distanceKm: 0,
        pickupLat: Number(matched?.pickup_lat ?? 0),
        pickupLng: Number(matched?.pickup_lng ?? 0),
        destLat: Number(matched?.dest_lat ?? 0),
        destLng: Number(matched?.dest_lng ?? 0),
      };
      lastOfferIdRef.current = offerId;
      setPendingOffer(tripOffer);
      setScreen('ride_offer');
    } catch (e) {
      console.error('[Offer] hydrate failed:', e);
    }
  }, []);

  // Once authenticated decide where to start
  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      setScreen('login');
      return;
    }
    setScreen('checking');
    // Check if driver has completed onboarding (has a name set)
    api.getDriver(session.driverId)
      .then((driver: Record<string, unknown>) => {
        const tier = Number(driver.subscription_tier ?? driver.subscriptionTier ?? 1);
        setDriverTier((Math.min(Math.max(tier, 1), 3)) as 1 | 2 | 3);
        if (!driver.name || String(driver.name).trim() === '') {
          setScreen('onboarding');
        } else {
          setScreen('dashboard');
        }
      })
      .catch(() => setScreen('dashboard'));
  }, [session, isLoading]);

  // Subscribe to Supabase Realtime trip_offers when driver is online
  useEffect(() => {
    if (!session || !isOnline) return;

    const channel = supabase
      .channel(`driver-offers-${session.driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_offers',
          filter: `driver_id=eq.${session.driverId}`,
        },
        async (payload) => {
          const offer = payload.new as Record<string, unknown>;
          await hydrateOffer(offer);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, isOnline, hydrateOffer]);

  // Polling fallback when realtime delivery is unavailable.
  useEffect(() => {
    if (!session || !isOnline || screen !== 'dashboard' || pendingOffer) return;
    const run = async () => {
      try {
        const offers = await api.getPendingOffers(session.driverId);
        const next = offers[0];
        if (next) await hydrateOffer(next);
      } catch {
        // ignore transient polling errors
      }
    };
    run();
    const id = setInterval(run, 3000);
    return () => clearInterval(id);
  }, [session, isOnline, screen, pendingOffer, hydrateOffer]);

  // GPS location tracking — update server every 10s when online
  useEffect(() => {
    if (!session || !isOnline) return;

    const sendLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          api.updateLocation(session.driverId, pos.coords.latitude, pos.coords.longitude)
            .catch(e => console.warn('[GPS] location update failed:', e));
        },
        (err) => console.warn('[GPS] geolocation error:', err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
      );
    };

    sendLocation(); // immediate first ping
    const interval = setInterval(sendLocation, 10_000);
    return () => clearInterval(interval);
  }, [session, isOnline]);

  const handleOnlineToggle = useCallback(async (online: boolean) => {
    if (!session) return;
    wasOnlineRef.current = online; // remember the driver's intent
    setIsOnline(online);
    try {
      await api.setOnlineStatus(session.driverId, online, online);
    } catch (e) {
      console.error('[Status] failed to update online status:', e);
    }
  }, [session]);

  const handleAcceptOffer = useCallback(async () => {
    if (!pendingOffer || !session) return;
    if (isAcceptingRef.current) return; // prevent duplicate taps
    isAcceptingRef.current = true;
    try {
      await api.acceptTrip(pendingOffer.tripId, pendingOffer.offerId);
      setActiveTrip(pendingOffer);
      setPendingOffer(null);
      setScreen('navigation');
    } catch (e) {
      console.error('[Offer] accept failed:', e);
    } finally {
      isAcceptingRef.current = false;
    }
  }, [pendingOffer, session]);

  const handleDeclineOffer = useCallback(async () => {
    if (!pendingOffer) return;
    try {
      await api.declineTrip(pendingOffer.tripId, pendingOffer.offerId);
    } catch { /* ignore */ }
    setPendingOffer(null);
    lastOfferIdRef.current = null;
    setScreen('dashboard');
  }, [pendingOffer]);

  const handleTripComplete = useCallback(async () => {
    if (!activeTrip) { setScreen('dashboard'); return; }
    try {
      await api.updateTripStatus(activeTrip.tripId, 'completed');
    } catch { /* ignore */ }
    setActiveTrip(null);
    // Restore to driver's last chosen online state, not forcibly online
    const shouldBeOnline = wasOnlineRef.current;
    setIsOnline(shouldBeOnline);
    if (session) {
      api.setOnlineStatus(session.driverId, shouldBeOnline, shouldBeOnline).catch(() => {});
    }
    setScreen('dashboard');
  }, [activeTrip, session]);

  const handleOnboardingComplete = async (name: string) => {
    if (session) {
      try {
        await api.updateDriver(session.driverId, { name });
        // Update local storage name
        localStorage.setItem('wasel_driver_name', name);
      } catch (e) {
        console.warn('[Onboarding] could not save name:', e);
      }
    }
    setScreen('dashboard');
  };

  if (isLoading || screen === 'checking') {
    return (
      <div style={{
        height: '100%', background: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Sora', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'login' && (
        <LoginScreen key="login" onAuthenticated={() => {
          // Trigger the useEffect that checks driver profile
          // (session state update in AuthContext will re-run the effect)
        }} />
      )}
      {screen === 'onboarding' && (
        <OnboardingScreen key="onboarding" onComplete={handleOnboardingComplete} />
      )}
      {screen === 'dashboard' && (
        <DashboardScreen
          key="dashboard"
          isOnline={isOnline}
          onToggleOnline={handleOnlineToggle}
          onNewRide={() => {
            // Dev: simulate an incoming offer for testing
            setPendingOffer({
              offerId:      'sim-offer',
              tripId:       'sim-trip',
              pickupAddress:'Al-Sweifiyyeh Mall',
              destAddress:  'Abdali Boulevard',
              fareJd:       4.20,
              distanceKm:   2.1,
              pickupLat:    31.9514,
              pickupLng:    35.8954,
              destLat:      31.9547,
              destLng:      35.9103,
            });
            setScreen('ride_offer');
          }}
          onSubscription={() => setScreen('subscription')}
          onHistory={() => setScreen('history')}
        />
      )}
      {screen === 'ride_offer' && pendingOffer && (
        <RideOfferScreen
          key="ride_offer"
          offer={pendingOffer}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
        />
      )}
      {screen === 'navigation' && activeTrip && (
        <NavigationScreen
          key="navigation"
          trip={activeTrip}
          onComplete={handleTripComplete}
        />
      )}
      {screen === 'subscription' && (
        <SubscriptionScreen
          key="subscription"
          onBack={() => setScreen('dashboard')}
          currentTier={driverTier}
          onTierChange={(tier) => setDriverTier(tier)}
        />
      )}
      {screen === 'history' && session && (
        <TripHistoryScreen
          key="history"
          driverId={session.driverId}
          onBack={() => setScreen('dashboard')}
        />
      )}
    </AnimatePresence>
  );
}

// ── Root with phone frame ─────────────────────────────────────────────────────

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <div
        style={{
          width: '100vw', height: '100vh',
          background: '#000000',
          overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Phone frame */}
        <div
          style={{
            width: 390, height: 844,
            background: '#000000',
            borderRadius: '3rem',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: [
              '0 0 0 1px rgba(255,255,255,0.08)',
              '0 0 0 3px rgba(0,0,0,0.9)',
              '0 0 80px rgba(212,168,67,0.08)',
              '0 40px 120px rgba(0,0,0,0.9)',
            ].join(', '),
          }}
        >
          <InnerApp />
        </div>

        {/* Branding */}
        <div style={{
          position: 'absolute', bottom: 24, left: 0, right: 0,
          textAlign: 'center', fontFamily: "'Tajawal', 'Cairo', sans-serif",
          fontSize: 14, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
        }}>
          واصل DRIVER · AMMAN, JORDAN
        </div>
      </div>
    </AuthProvider>
    </LanguageProvider>
  );
}
