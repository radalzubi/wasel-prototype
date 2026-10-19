import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onBack: () => void;
  currentTier?: 1 | 2 | 3;
  onTierChange?: (tier: 1 | 2 | 3) => void;
}

const T = {
  bg:      '#000000',
  surface: '#0E0E0E',
  card:    '#181818',
  border:  'rgba(255,255,255,0.07)',
  text:    'rgba(255,255,255,0.92)',
  muted:   'rgba(255,255,255,0.4)',
};

const TIERS = [
  {
    tier: 1 as const,
    name: 'Silver',
    arabicName: 'فضي',
    price: 15,
    color: '#94A3B8',
    glow: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.35)',
    perks: [
      'Standard ride matching',
      'Basic in-app support',
      'Weekly payouts',
      '40% dispatch priority',
    ],
  },
  {
    tier: 2 as const,
    name: 'Gold',
    arabicName: 'ذهبي',
    price: 35,
    color: '#D4A843',
    glow: 'rgba(212,168,67,0.12)',
    border: 'rgba(212,168,67,0.35)',
    popular: true,
    perks: [
      'Priority ride matching',
      'Dedicated support',
      'Daily payouts',
      '+15% more ride offers',
      '70% dispatch priority',
    ],
  },
  {
    tier: 3 as const,
    name: 'Platinum',
    arabicName: 'بلاتيني',
    price: 60,
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.35)',
    perks: [
      'Top-tier dispatch priority',
      '24/7 VIP support',
      'Instant payouts',
      '+35% more ride offers',
      'Monthly bonuses',
      '100% dispatch priority',
    ],
  },
];

export function SubscriptionScreen({ onBack, currentTier = 1, onTierChange }: Props) {
  const { session } = useAuth();
  const [activeTier, setActiveTier] = useState<1 | 2 | 3>(currentTier);
  const [switching, setSwitching] = useState<number | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  async function handleSwitch(tier: 1 | 2 | 3) {
    if (tier === activeTier || switching !== null) return;
    setSwitching(tier);
    try {
      if (session) {
        await api.updateDriver(session.driverId, { subscriptionTier: tier });
      }
      setActiveTier(tier);
      onTierChange?.(tier);
      setSuccess(tier);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error('[Subscription] tier switch failed:', e);
    } finally {
      setSwitching(null);
    }
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        height: '100%', background: T.bg,
        fontFamily: "'Sora', sans-serif", overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        background: T.surface, padding: '48px 20px 20px',
        borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onBack}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} color="white" />
          </motion.button>
          <div>
            <div style={{ fontFamily: "'Tajawal','Cairo',sans-serif", fontSize: 18, color: 'white', fontWeight: 700 }}>
              Driver Tiers
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>
              Higher tier = more rides dispatched to you
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 40px' }}>
        {/* BMP info banner */}
        <div style={{
          background: 'rgba(212,168,67,0.06)',
          border: '1px solid rgba(212,168,67,0.18)',
          borderRadius: 14, padding: '12px 14px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Zap size={14} color="#D4A843" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
            <strong style={{ color: '#D4A843' }}>BMP Algorithm:</strong>{' '}
            Wasel scores drivers by proximity (40%), tier (30%), activity (20%), and idle time (10%).
            A Platinum driver gets <strong style={{ color: 'rgba(255,255,255,0.75)' }}>2.5× more rides</strong> than Silver.
          </p>
        </div>

        {/* Success toast */}
        {success !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 14,
              color: '#34D399', fontSize: 13, fontWeight: 600, textAlign: 'center',
            }}
          >
            ✓ Switched to {TIERS.find(t => t.tier === success)?.name} — changes take effect immediately
          </motion.div>
        )}

        {/* Tier cards */}
        {TIERS.map((t, idx) => {
          const isCurrent = activeTier === t.tier;
          const isSwitching = switching === t.tier;

          return (
            <motion.div
              key={t.tier}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              style={{
                background: isCurrent ? t.glow : 'rgba(255,255,255,0.025)',
                border: isCurrent ? `1.5px solid ${t.border}` : `1px solid rgba(255,255,255,0.07)`,
                borderLeft: `3px solid ${t.color}`,
                borderRadius: 20, padding: '18px 18px 14px',
                marginBottom: 12, position: 'relative',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Badges row — never overlap */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {isCurrent && (
                  <span style={{
                    background: `${t.color}20`, color: t.color,
                    fontSize: 10, fontWeight: 700, padding: '3px 10px',
                    borderRadius: 20, border: `1px solid ${t.color}44`,
                    letterSpacing: '0.04em',
                  }}>
                    ✓ CURRENT PLAN
                  </span>
                )}
                {t.popular && !isCurrent && (
                  <span style={{
                    background: '#D4A843', color: '#111',
                    fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                    letterSpacing: '0.06em',
                  }}>
                    POPULAR
                  </span>
                )}
              </div>

              {/* Name + price row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "'Tajawal','Cairo',sans-serif", fontSize: 12, color: t.color, marginBottom: 2 }}>
                    {t.arabicName}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{t.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: t.color, lineHeight: 1 }}>{t.price}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>JD / month</div>
                </div>
              </div>

              {/* Perks */}
              <div style={{ marginBottom: 14 }}>
                {t.perks.map(perk => (
                  <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Check size={12} color={t.color} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{perk}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSwitch(t.tier)}
                disabled={isCurrent || isSwitching}
                style={{
                  width: '100%',
                  background: isCurrent
                    ? t.color
                    : `rgba(255,255,255,0.05)`,
                  border: isCurrent ? 'none' : `1px solid ${t.color}55`,
                  borderRadius: 14, padding: '11px 0',
                  color: isCurrent ? '#111' : t.color,
                  fontWeight: 700, fontSize: 13,
                  cursor: isCurrent ? 'default' : isSwitching ? 'wait' : 'pointer',
                  fontFamily: "'Sora', sans-serif",
                  opacity: isSwitching ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isCurrent ? '✓ Active Plan' : isSwitching ? 'Switching…' : `Switch to ${t.name}`}
              </motion.button>
            </motion.div>
          );
        })}

        {/* Footer note */}
        <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
          Tiers renew monthly. Cancel or change anytime.
          <br />Contact support for billing questions.
        </p>
      </div>
    </motion.div>
  );
}
