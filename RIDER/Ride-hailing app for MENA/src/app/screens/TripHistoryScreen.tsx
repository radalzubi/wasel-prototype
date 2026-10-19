import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, AlertTriangle, BadgeDollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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

export function TripHistoryScreen() {
  const { session } = useAuth();
  const { isRTL, lang } = useLanguage();
  const fontFamily = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      if (!session?.riderId) {
        if (mounted) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      try {
        const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');
        const res = await fetch(`${API_URL}/api/riders/${session.riderId}/trips`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(String((body as Record<string, unknown>).error ?? 'Failed to load history'));
        }
        const data = await res.json() as unknown;
        const parsedRows = Array.isArray(data)
          ? data
          : (Array.isArray((data as { trips?: unknown[] }).trips) ? (data as { trips: unknown[] }).trips : []);
        if (!mounted) return;
        setRows(parsedRows as TripRow[]);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load history');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [session?.riderId, session?.accessToken, reloadKey]);

  const statusColor = (status: string | undefined): string => {
    if (status === 'completed') return '#34D399';
    if (status === 'cancelled') return '#F87171';
    if (status === 'in_progress' || status === 'arrived' || status === 'en_route') return '#60A5FA';
    if (status === 'accepted') return '#FBBF24';
    return '#D4A843';
  };

  const formatStatus = (status: string | undefined): string => {
    const normalized = String(status ?? 'unknown');
    if (lang === 'ar') {
      if (normalized === 'completed') return 'مكتملة';
      if (normalized === 'cancelled') return 'ملغاة';
      if (normalized === 'accepted') return 'تم قبولها';
      if (normalized === 'in_progress') return 'قيد الرحلة';
      if (normalized === 'arrived') return 'وصل السائق';
      if (normalized === 'en_route') return 'في الطريق';
      if (normalized === 'dispatching') return 'جارٍ البحث';
      if (normalized === 'no_driver_found') return 'لا يوجد سائق';
    }
    return normalized.replaceAll('_', ' ').toUpperCase();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-5 wasel-scroll-pad" style={{ background: 'var(--bg-primary)', scrollbarWidth: 'none' }}>
      {loading && (
        <>
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              className="rounded-2xl p-4 mb-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.7 }}
            >
              <div style={{ height: 12, width: '40%', borderRadius: 8, background: 'var(--bg-input)', marginBottom: 10 }} />
              <div style={{ height: 10, width: '90%', borderRadius: 8, background: 'var(--bg-input)', marginBottom: 8 }} />
              <div style={{ height: 10, width: '65%', borderRadius: 8, background: 'var(--bg-input)' }} />
            </div>
          ))}
        </>
      )}
      {error && (
        <div
          className="rounded-2xl p-4 mb-3 flex items-center gap-2"
          style={{ border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.12)', color: '#F87171', fontFamily, fontSize: 13 }}
        >
          <AlertTriangle size={15} />
          {error}
          <button
            onClick={() => setReloadKey(prev => prev + 1)}
            style={{
              marginInlineStart: 'auto',
              borderRadius: 10,
              border: '1px solid rgba(248,113,113,0.5)',
              background: 'rgba(248,113,113,0.15)',
              color: '#FCA5A5',
              fontFamily,
              fontSize: 12,
              padding: '6px 10px',
            }}
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-tertiary)', fontFamily, fontSize: 13 }}>
          {lang === 'ar' ? 'لا توجد رحلات بعد. اطلب رحلتك الأولى!' : 'No trips yet. Request your first ride!'}
        </div>
      )}
      {!loading && !error && rows.map((trip) => (
        <div key={trip.id} className="rounded-2xl p-4 mb-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {(() => {
            const timestamp = trip.completed_at ?? trip.created_at;
            const dateText = timestamp ? new Date(timestamp).toLocaleString() : (lang === 'ar' ? 'غير متاح' : 'N/A');
            return (
          <div className="flex items-center justify-between mb-2">
            <span
              style={{
                fontFamily,
                fontSize: 11,
                fontWeight: 700,
                color: statusColor(trip.status),
                background: `${statusColor(trip.status)}1A`,
                border: `1px solid ${statusColor(trip.status)}55`,
                borderRadius: 999,
                padding: '3px 8px',
              }}
            >
              {formatStatus(trip.status)}
            </span>
            <span style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)' }}>{dateText}</span>
          </div>
            );
          })()}
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)', fontFamily, fontSize: 12.5 }}>
            <MapPin size={14} />
            <span>{trip.pickup_address ?? 'Pickup'} {'->'} {trip.dest_address ?? 'Destination'}</span>
          </div>
          <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)', fontFamily, fontSize: 12 }}>
            <span className="flex items-center gap-1"><BadgeDollarSign size={13} /> {(trip.fare_jd ?? 0).toFixed(3)} JD</span>
            <span className="flex items-center gap-1"><Calendar size={13} /> {trip.payment_method ?? 'cash'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
