import React, { useState, useEffect, useCallback } from 'react';
import { Browser } from '@capacitor/browser';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, MapPin, Phone, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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

interface Props {
  trip: TripOffer;
  onComplete: () => void;
}

type NavStage = 'en_route' | 'arrived' | 'in_progress' | 'completed';

const STAGE_STATUS: Record<NavStage, string> = {
  en_route:    'en_route',
  arrived:     'arrived',
  in_progress: 'in_progress',
  completed:   'completed',
};

export function NavigationScreen({ trip, onComplete }: Props) {
  const { session } = useAuth();
  const [stage, setStage] = useState<NavStage>('en_route');
  const [isCancelling, setIsCancelling] = useState(false);

  const stages = {
    en_route:    { label: 'En Route to Pickup',  color: '#60A5FA', icon: Navigation,   action: "I've Arrived",   next: 'arrived'     as NavStage },
    arrived:     { label: 'Waiting for Rider',   color: '#FBBF24', icon: MapPin,       action: 'Rider On Board', next: 'in_progress' as NavStage },
    in_progress: { label: 'Trip In Progress',    color: '#34D399', icon: Navigation,   action: 'Complete Trip',  next: 'completed'   as NavStage },
    completed:   { label: 'Trip Completed!',     color: '#D4A843', icon: CheckCircle,  action: 'Back to Dashboard', next: null },
  };

  const current = stages[stage];
  const Icon = current.icon;

  const openNavigation = useCallback(() => {
    // En-route → navigate to pickup; in progress → navigate to destination
    const destLat = stage === 'in_progress' ? trip.destLat : trip.pickupLat;
    const destLng = stage === 'in_progress' ? trip.destLng : trip.pickupLng;
    if (!destLat || !destLng) return;
    // Universal Google Maps URL (works on iOS, Android, and desktop)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
    void Browser.open({ url });
  }, [stage, trip]);

  // Update Supabase trip status on stage change
  const advanceStage = useCallback(async () => {
    if (!current.next) {
      onComplete();
      return;
    }
    const nextStage = current.next;
    setStage(nextStage);
    try {
      await api.updateTripStatus(trip.tripId, STAGE_STATUS[nextStage]);
    } catch (e) {
      console.warn('[Nav] status update failed:', e);
    }
  }, [current.next, trip.tripId, onComplete]);

  // GPS tracking during navigation
  useEffect(() => {
    if (!session || stage === 'completed') return;
    const sendLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        pos => {
          api.updateLocationWithTrip(
            session.driverId,
            pos.coords.latitude,
            pos.coords.longitude,
            trip.tripId,
          )
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 },
      );
    };
    sendLocation();
    const interval = setInterval(sendLocation, 8_000);
    return () => clearInterval(interval);
  }, [session, stage, trip.tripId]);

  const cancelTrip = useCallback(async () => {
    if (isCancelling || stage === 'completed') return;
    setIsCancelling(true);
    try {
      await api.cancelTrip(trip.tripId, 'Driver cancelled before trip completion');
      onComplete();
    } finally {
      setIsCancelling(false);
    }
  }, [isCancelling, onComplete, stage, trip.tripId]);

  useEffect(() => {
    api.updateTripStatus(trip.tripId, STAGE_STATUS.en_route).catch(() => {});
  }, [trip.tripId]);

  useEffect(() => {
    const channel = supabase
      .channel(`driver-trip-${trip.tripId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${trip.tripId}`,
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const status = String(row.status ?? '');
        if (status === 'cancelled' || status === 'no_driver_found') {
          onComplete();
          return;
        }
        if (status === 'en_route') setStage('en_route');
        if (status === 'arrived') setStage('arrived');
        if (status === 'in_progress') setStage('in_progress');
        if (status === 'completed') setStage('completed');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.tripId, onComplete]);

  // Polling fallback when realtime trip updates are delayed/unavailable.
  useEffect(() => {
    const run = async () => {
      try {
        const row = await api.getTripById(trip.tripId);
        const status = String(row.status ?? '');
        if (status === 'cancelled' || status === 'no_driver_found') {
          onComplete();
          return;
        }
        if (status === 'en_route') setStage('en_route');
        if (status === 'arrived') setStage('arrived');
        if (status === 'in_progress') setStage('in_progress');
        if (status === 'completed') setStage('completed');
      } catch {
        // ignore transient polling errors
      }
    };
    const id = setInterval(run, 4000);
    return () => clearInterval(id);
  }, [trip.tripId, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        height: '100%', background: '#000000',
        fontFamily: "'Sora', sans-serif",
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Map area */}
      <div style={{
        flex: 1, background: '#000000',
        position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: [
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '30px 30px',
        }} />

        {/* Stage indicator */}
        <motion.div
          key={stage}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: `${current.color}18`,
            border: `1px solid ${current.color}44`,
            borderRadius: 20, padding: '16px 24px',
            textAlign: 'center', zIndex: 1,
          }}
        >
          <Icon size={32} color={current.color} style={{ margin: '0 auto 8px' }} />
          <div style={{ color: current.color, fontWeight: 700, fontSize: 15 }}>{current.label}</div>
          {stage !== 'completed' && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
              {stage === 'en_route'
                ? `${trip.distanceKm > 0 ? `${trip.distanceKm.toFixed(1)} km to pickup` : 'Navigating…'}`
                : stage === 'arrived'
                ? 'Waiting for rider…'
                : 'Trip in progress'}
            </div>
          )}
        </motion.div>
      </div>

      {/* Open in Maps button — shown during active route stages */}
      {(stage === 'en_route' || stage === 'arrived' || stage === 'in_progress') && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openNavigation}
          style={{
            position: 'absolute', bottom: 240, right: 16,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer', zIndex: 10,
          }}
        >
          <ExternalLink size={14} color="#60A5FA" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#60A5FA', fontFamily: "'Sora', sans-serif" }}>
            {(stage === 'en_route' || stage === 'arrived') ? 'Navigate to Pickup' : 'Navigate to Dest'}
          </span>
        </motion.button>
      )}

      {/* Bottom panel */}
      <div style={{
        background: 'rgba(0,0,0,0.98)',
        backdropFilter: 'blur(32px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: 20,
      }}>
        <AnimatePresence>
          {stage !== 'completed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'rgba(212,168,67,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Rider</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {trip.pickupAddress} → {trip.destAddress}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[Phone, MessageSquare].map((Ic, i) => (
                  <button key={i} style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                    <Ic size={16} color="rgba(255,255,255,0.6)" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fare when completed */}
        {stage === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', marginBottom: 20 }}
          >
            <div style={{ fontSize: 36, fontWeight: 800, color: '#D4A843' }}>
              {trip.fareJd.toFixed(2)} JD
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Trip earnings · {trip.pickupAddress} → {trip.destAddress}
            </div>
          </motion.div>
        )}

        {/* Action button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={advanceStage}
          style={{
            width: '100%',
            background: stage === 'completed'
              ? 'linear-gradient(135deg, #D4A843 0%, #C49B2E 100%)'
              : `${current.color}18`,
            border: stage === 'completed' ? 'none' : `1px solid ${current.color}44`,
            borderRadius: 18, padding: '15px 0',
            color: stage === 'completed' ? '#111111' : current.color,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {current.action}
        </motion.button>
        {stage !== 'completed' && (
          <button
            onClick={cancelTrip}
            disabled={isCancelling}
            style={{
              marginTop: 10,
              width: '100%',
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.35)',
              borderRadius: 14,
              padding: '10px 0',
              color: '#F87171',
              fontSize: 13,
              fontWeight: 700,
              cursor: isCancelling ? 'not-allowed' : 'pointer',
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {isCancelling ? 'Cancelling…' : 'Cancel Trip'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
