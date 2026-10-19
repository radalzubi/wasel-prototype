import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Car, Star, DollarSign, TrendingUp, Bell, ChevronRight,
  MapPin, Clock, Zap, Shield, Settings, LogOut, Wifi, WifiOff, Globe,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDriverLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';

// ── Design tokens (mirrors rider app black theme) ─────────────────────────────
const T = {
  bg:          '#000000',
  surface:     '#0E0E0E',
  card:        '#181818',
  cardBorder:  'rgba(255,255,255,0.08)',
  accent:      '#D4A843',
  accentDim:   'rgba(212,168,67,0.12)',
  accentBorder:'rgba(212,168,67,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSec:     'rgba(255,255,255,0.50)',
  textMuted:   'rgba(255,255,255,0.28)',
  success:     '#34D399',
  divider:     'rgba(255,255,255,0.07)',
};
const font = "'Sora', sans-serif";
const TIER_NAMES: Record<number, string>  = { 1: 'Silver', 2: 'Gold', 3: 'Platinum' };
const TIER_COLORS: Record<number, string> = { 1: '#9CA3AF', 2: '#D4A843', 3: '#C084FC' };

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  subscriptionTier: number;
  rating: number;
  totalTrips: number;
  acceptanceRate: number;
  car?: { make: string; model: string; year: number; color: string; plate: string; type: string };
}

interface RecentTrip {
  id: string;
  from: string;
  to: string;
  fare: number;
  duration: string;
  date: string;
}

interface Props {
  isOnline: boolean;
  onToggleOnline: (online: boolean) => void;
  onNewRide: () => void;
  onSubscription: () => void;
  onHistory: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; label: string; value: string; sub?: string }) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      style={{
        background: T.card, border: `1px solid ${T.cardBorder}`,
        borderRadius: 18, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <Icon size={16} color={T.accent} strokeWidth={2} />
      <div style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, lineHeight: 1, fontFamily: font }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: T.textMuted, fontFamily: font, letterSpacing: '0.04em' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.textMuted, fontFamily: font }}>{sub}</div>}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardScreen({ isOnline, onToggleOnline, onNewRide, onSubscription, onHistory }: Props) {
  const { session, logout } = useAuth();
  const { lang, setLang, isRTL, fontFamily: rtlFont } = useDriverLanguage();
  const [driver, setDriver]         = useState<DriverProfile | null>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [isLoadingDriver, setIsLoadingDriver] = useState(true);
  const [toggling, setToggling]     = useState(false);
  const devRideSimulatorEnabled =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_RIDE_SIMULATOR === 'true';

  useEffect(() => {
    if (!session) return;
    api.getDriver(session.driverId)
      .then((raw: Record<string, unknown>) => {
        setDriver({
          id:              String(raw.id ?? ''),
          name:            String(raw.name ?? session.phone),
          phone:           String(raw.phone ?? session.phone),
          subscriptionTier: Number(raw.subscriptionTier ?? raw.subscription_tier ?? 1),
          rating:          Number(raw.rating ?? 5.0),
          totalTrips:      Number(raw.totalTrips ?? raw.total_trips ?? 0),
          acceptanceRate:  Math.round(Number(raw.acceptanceRate ?? raw.acceptance_rate ?? 0.9) * 100),
          car: raw.car_make ? {
            make:  String(raw.car_make),
            model: String(raw.car_model ?? ''),
            year:  Number(raw.car_year ?? 0),
            color: String(raw.car_color ?? ''),
            plate: String(raw.car_plate ?? ''),
            type:  String(raw.car_type ?? 'sedan'),
          } : undefined,
        });
      })
      .catch(() => { /* offline — show skeleton */ })
      .finally(() => setIsLoadingDriver(false));

    api.getDriverTrips(session.driverId)
      .then((trips: Record<string, unknown>[]) => {
        setRecentTrips(
          trips.slice(0, 5).map(t => ({
            id:       String(t.id),
            from:     String(t.pickup_address ?? 'Pickup'),
            to:       String(t.dest_address ?? 'Destination'),
            fare:     Number(t.fare_jd ?? 0),
            duration: t.duration_mins ? `${t.duration_mins} min` : '—',
            date:     t.completed_at
              ? new Date(String(t.completed_at)).toLocaleDateString('en-JO', { month: 'short', day: 'numeric' })
              : 'Today',
          }))
        );
      })
      .catch(() => {});
  }, [session]);

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    try { await onToggleOnline(!isOnline); } finally { setToggling(false); }
  }

  const tierColor = TIER_COLORS[driver?.subscriptionTier ?? 1];
  const displayName = driver?.name || session?.phone || '—';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ height: '100%', background: T.bg, color: T.textPrimary, overflowY: 'auto', fontFamily: isRTL ? rtlFont : font, direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background: T.surface, padding: '48px 20px 20px',
        borderBottom: `1px solid ${T.divider}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontFamily: "'Tajawal', 'Cairo', sans-serif",
              fontSize: 22, color: T.accent, fontWeight: 800, direction: 'rtl', marginBottom: 4,
            }}>
              واصل
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>
              {isLoadingDriver ? '…' : displayName}
            </div>

            {/* Online toggle */}
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                marginTop: 6, display: 'flex', alignItems: 'center', gap: 7,
                background: 'transparent', border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
                padding: 0, opacity: toggling ? 0.6 : 1,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isOnline ? T.success : '#6B7280',
                boxShadow: isOnline ? `0 0 8px ${T.success}` : 'none',
                transition: 'all 0.3s',
              }} />
              <span style={{ fontSize: 12, color: isOnline ? T.success : T.textSec, fontFamily: font }}>
                {toggling
                  ? (isOnline
                      ? (lang === 'ar' ? 'جارٍ قطع الاتصال…' : 'Going offline…')
                      : (lang === 'ar' ? 'جارٍ الاتصال…' : 'Going online…'))
                  : isOnline
                    ? (lang === 'ar' ? 'متصل · جاهز للرحلات' : 'Online · Ready for rides')
                    : (lang === 'ar' ? 'غير متصل · اضغط للاتصال' : 'Offline · Tap to go online')}
              </span>
              {isOnline ? <Wifi size={12} color={T.success} /> : <WifiOff size={12} color={T.textMuted} />}
            </button>
          </div>

          {/* Tier badge */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${tierColor}33`,
            borderRadius: 14, padding: '8px 14px', textAlign: 'right',
          }}>
            <div style={{ fontSize: 10, color: tierColor, fontFamily: font, fontWeight: 700, letterSpacing: '0.06em' }}>
              {TIER_NAMES[driver?.subscriptionTier ?? 1].toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: T.textSec, fontFamily: font, marginTop: 1 }}>
              Tier {driver?.subscriptionTier ?? 1}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 120px' }}>

        {/* ── Stats grid ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <StatCard icon={Car}        label="Total Trips"  value={String(driver?.totalTrips ?? '—')} />
          <StatCard icon={Star}       label="Rating"       value={driver ? driver.rating.toFixed(1) : '—'} sub="Rider average" />
          <StatCard icon={TrendingUp} label="Acceptance"   value={driver ? `${driver.acceptanceRate}%` : '—'} sub="All time" />
          <StatCard icon={DollarSign} label="Subscription" value={TIER_NAMES[driver?.subscriptionTier ?? 1]} />
        </div>

        {/* ── Vehicle card ─────────────────────────────────────────────── */}
        {driver?.car && (
          <div style={{
            background: T.card, border: `1px solid ${T.cardBorder}`,
            borderRadius: 18, padding: 16, marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: T.accentDim, border: `1px solid ${T.accentBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Car size={18} color={T.accent} />
                </div>
                <div>
                  <div style={{ fontFamily: font, fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
                    {driver.car.make} {driver.car.model}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 11, color: T.textMuted }}>Your Vehicle</div>
                </div>
              </div>
              <button style={{
                background: 'transparent', border: `1px solid ${T.cardBorder}`,
                borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
                fontFamily: font, fontSize: 11, color: T.textSec,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Settings size={11} /> Edit
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Year',  value: String(driver.car.year) },
                { label: 'Color', value: driver.car.color },
                { label: 'Type',  value: driver.car.type },
                { label: 'Plate', value: driver.car.plate },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: T.surface, border: `1px solid ${T.divider}`,
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{ fontFamily: font, fontSize: 10, color: T.textMuted, marginBottom: 3 }}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 10, padding: '8px 12px',
            }}>
              <Shield size={13} color="#34D399" />
              <span style={{ fontFamily: font, fontSize: 11, color: '#34D399', fontWeight: 600 }}>
                Vehicle Verified · Insurance Active
              </span>
            </div>
          </div>
        )}

        {/* ── Subscription card ─────────────────────────────────────────── */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSubscription}
          style={{
            width: '100%', background: T.accentDim,
            border: `1px solid ${T.accentBorder}`,
            borderLeft: `3px solid ${T.accent}`,
            borderRadius: 18, padding: '14px 16px',
            color: T.textPrimary, textAlign: 'left',
            cursor: 'pointer', marginBottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: font,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>
              🏆 {TIER_NAMES[driver?.subscriptionTier ?? 1]} Subscription
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              Upgrade for higher dispatch priority
            </div>
          </div>
          <ChevronRight size={16} color={T.textMuted} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onHistory}
          style={{
            width: '100%',
            background: 'rgba(96,165,250,0.10)',
            border: '1px solid rgba(96,165,250,0.30)',
            borderRadius: 16,
            padding: '12px 14px',
            color: '#93C5FD',
            textAlign: 'left',
            cursor: 'pointer',
            marginBottom: 12,
            fontFamily: font,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Trip History
        </motion.button>

        {devRideSimulatorEnabled ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNewRide}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #D4A843, #C49B2E)',
              border: 'none', borderRadius: 18, padding: '16px 0',
              color: '#111111', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: font,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Bell size={16} />
            {isOnline ? 'Inject Test Offer (Dev)' : 'Test Ride Offer (Dev)'}
          </motion.button>
        ) : (
          <div
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.cardBorder}`,
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Bell size={16} color={isOnline ? T.success : T.textMuted} />
            <div style={{ fontFamily: font }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                {isOnline ? 'Listening for live ride offers' : 'Go online to receive ride offers'}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                {isOnline
                  ? 'Dispatch is active and waiting for backend offers.'
                  : 'Your availability is off, so dispatch will skip this driver.'}
              </div>
            </div>
          </div>
        )}

        {/* ── Recent trips ──────────────────────────────────────────────── */}
        {recentTrips.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontFamily: font, fontSize: 11, letterSpacing: '0.07em',
              color: T.textMuted, marginBottom: 12, fontWeight: 600,
            }}>
              RECENT TRIPS
            </div>
            {recentTrips.map((trip, i) => (
              <div
                key={trip.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 0',
                  borderBottom: i < recentTrips.length - 1 ? `1px solid ${T.divider}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: T.card, border: `1px solid ${T.cardBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MapPin size={14} color={T.textMuted} />
                  </div>
                  <div>
                    <div style={{ fontFamily: font, fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>
                      {trip.from} → {trip.to}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 11, color: T.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />
                      {trip.duration} · {trip.date}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: T.accent }}>
                  {trip.fare.toFixed(2)} JD
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Weekly earnings summary ───────────────────────────────────── */}
        {recentTrips.length > 0 && (
          <div style={{
            marginTop: 14, background: T.card, border: `1px solid ${T.cardBorder}`,
            borderRadius: 18, padding: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: font, fontSize: 11, color: T.textMuted, letterSpacing: '0.06em', marginBottom: 4 }}>
                RECENT EARNINGS
              </div>
              <div style={{ fontFamily: font, fontSize: 26, fontWeight: 700, color: T.textPrimary }}>
                {recentTrips.reduce((s, t) => s + t.fare, 0).toFixed(2)}{' '}
                <span style={{ fontSize: 14, opacity: 0.5 }}>JD</span>
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: T.accentDim, border: `1px solid ${T.accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={20} color={T.accent} />
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: `1px solid ${T.divider}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 8,
        }}>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.cardBorder}`,
              borderRadius: 10, padding: '5px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: font, fontSize: 11, color: T.textSec,
            }}
          >
            <Globe size={12} />
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>

          <div style={{ fontFamily: font, fontSize: 10, color: T.textMuted, textAlign: 'center', flex: 1 }}>
            واصل DRIVER · AMMAN
          </div>

          <button
            onClick={() => logout()}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: font, fontSize: 11, color: '#F87171',
            }}
          >
            <LogOut size={12} /> {lang === 'ar' ? 'خروج' : 'Sign out'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
