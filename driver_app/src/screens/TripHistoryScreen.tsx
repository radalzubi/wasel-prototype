import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Calendar, CircleDollarSign, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  driverId: string;
  onBack: () => void;
}

interface TripRow {
  id: string;
  pickup_address?: string;
  dest_address?: string;
  status?: string;
  fare_jd?: number;
  payment_method?: string;
  created_at?: string;
  completed_at?: string;
}

export function TripHistoryScreen({ driverId, onBack }: Props) {
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<{ totalTrips: number; totalEarnings: number; thisWeekEarnings: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [trips, sums] = await Promise.all([
          api.getDriverTrips(driverId),
          api.getDriverEarnings(driverId),
        ]);
        if (!mounted) return;
        setRows(trips as unknown as TripRow[]);
        setEarnings(sums);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load history');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [driverId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        height: '100%',
        background: '#000',
        color: 'rgba(255,255,255,0.92)',
        fontFamily: "'Sora', sans-serif",
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '48px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.75)',
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Trip History</div>
        {earnings && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {earnings.totalTrips} trips · {earnings.totalEarnings.toFixed(3)} JD total · {earnings.thisWeekEarnings.toFixed(3)} JD this week
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {loading && <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading history…</div>}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid rgba(248,113,113,0.4)',
            background: 'rgba(248,113,113,0.12)',
            borderRadius: 12,
            padding: 12,
            color: '#FCA5A5',
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.55)' }}>No trips yet.</div>
        )}
        {!loading && !error && rows.map((trip) => (
          <div
            key={trip.id}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D4A843' }}>{(trip.status ?? 'unknown').toUpperCase()}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{new Date(trip.completed_at ?? trip.created_at ?? '').toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              <MapPin size={14} />
              <span>{trip.pickup_address ?? 'Pickup'} {'->'} {trip.dest_address ?? 'Destination'}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CircleDollarSign size={13} /> {(trip.fare_jd ?? 0).toFixed(3)} JD</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {trip.payment_method ?? 'cash'}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
