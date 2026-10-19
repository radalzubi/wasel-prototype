import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Navigation, Clock, DollarSign, X, Check } from 'lucide-react';

interface TripOffer {
  offerId: string;
  tripId: string;
  pickupAddress: string;
  destAddress: string;
  fareJd: number;
  distanceKm: number;
  pickupLat: number;
  pickupLng: number;
}

interface Props {
  offer: TripOffer;
  onAccept: () => void;
  onDecline: () => void;
}

const OFFER_TTL = 15; // seconds

export function RideOfferScreen({ offer, onAccept, onDecline }: Props) {
  const [timeLeft, setTimeLeft] = useState(OFFER_TTL);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onDecline]);

  const progress = timeLeft / OFFER_TTL;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        height: '100%', background: '#000000',
        fontFamily: "'Sora', sans-serif",
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Alert header */}
      <div style={{ background: '#0E0E0E', padding: '48px 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: '#D4A843', marginBottom: 4 }}>NEW RIDE OFFER</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>Accept or Decline</div>
          </div>

          {/* Countdown ring */}
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="28" cy="28" r="24" fill="none"
                stroke={timeLeft > 5 ? '#D4A843' : '#F87171'}
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700,
              color: timeLeft > 5 ? '#D4A843' : '#F87171',
            }}>
              {timeLeft}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
        {/* Route details */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D4A843', border: '2px solid white' }} />
              <div style={{ width: 2, height: 24, background: 'rgba(255,255,255,0.15)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D4A843', border: '2px solid white' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>PICKUP</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{offer.pickupAddress}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>DESTINATION</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{offer.destAddress}</div>
              </div>
            </div>
          </div>

          {/* Trip stats */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: DollarSign, value: `${offer.fareJd.toFixed(2)} JD`, label: 'Fare' },
              { icon: Clock,      value: offer.distanceKm > 0 ? `~${Math.ceil(offer.distanceKm / 30 * 60)} min` : '— min', label: 'Est. Trip' },
              { icon: Navigation, value: offer.distanceKm > 0 ? `${offer.distanceKm.toFixed(1)} km` : '— km', label: 'To Pickup' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                borderRadius: 12, padding: '10px 0', textAlign: 'center',
              }}>
                <Icon size={14} color="#D4A843" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trip ID for ops reference */}
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.2)',
          textAlign: 'center', marginBottom: 8,
        }}>
          Trip #{offer.tripId.slice(0, 8)}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 20px 32px', display: 'flex', gap: 12 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onDecline}
          style={{
            flex: 1, padding: '16px 0',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: '#F87171', fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 14,
          }}
        >
          <X size={18} /> Decline
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAccept}
          style={{
            flex: 2, padding: '16px 0',
            background: 'linear-gradient(135deg, #D4A843 0%, #C49B2E 100%)',
            border: 'none', borderRadius: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: '#111111', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15,
          }}
        >
          <Check size={20} /> Accept Ride
        </motion.button>
      </div>
    </motion.div>
  );
}
