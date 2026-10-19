import React, { useState } from 'react';
import { MapPin, Navigation, Star, Clock, ChevronRight, X, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { EXPLORE_DESTINATIONS, ExploreDestination, ExploreCategory, AMMAN_PLACES, Place } from '../data/mockData';

interface ExploreScreenProps {
  onRideHere: (place: Place) => void;
}

type Filter = 'all' | ExploreCategory;

const FILTERS: { id: Filter; en: string; ar: string; emoji: string }[] = [
  { id: 'all',           en: 'All',            ar: 'الكل',       emoji: '🗺️' },
  { id: 'Cultural',      en: 'Landmarks',      ar: 'معالم',      emoji: '🏛️' },
  { id: 'Food',          en: 'Food',           ar: 'طعام',       emoji: '🍽️' },
  { id: 'Entertainment', en: 'Entertainment',  ar: 'ترفيه',      emoji: '🎭' },
  { id: 'Cafe',          en: 'Cafes',          ar: 'مقاهي',     emoji: '☕' },
  { id: 'Medical',       en: 'Medical',        ar: 'طبي',        emoji: '🏥' },
  { id: 'Shopping',      en: 'Shopping',       ar: 'تسوق',       emoji: '🛍️' },
];

const CATEGORY_COLOR: Record<Filter, string> = {
  all:           '#D4A843',
  Cultural:      '#60A5FA',
  Food:          '#F59E0B',
  Entertainment: '#A78BFA',
  Cafe:          '#34D399',
  Medical:       '#F87171',
  Shopping:      '#FB923C',
};

function StarRating({ rating, count, lang }: { rating: number; count: number; lang: string }) {
  const stars = Math.round(rating);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1,2,3,4,5].map(i => (
          <Star
            key={i}
            size={10}
            color={i <= stars ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
            fill={i <= stars ? '#F59E0B' : 'none'}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
        {rating.toFixed(1)}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
        ({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})
      </span>
    </div>
  );
}

function PriceLevel({ level }: { level?: number }) {
  if (!level) return null;
  const labels = ['', '$', '$$', '$$$', '$$$$'];
  return (
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
      {labels[level]}
    </span>
  );
}

// Detail bottom sheet
function PlaceDetail({
  dest, lang, isRTL, fontFamily, onClose, onRideHere,
}: {
  dest: ExploreDestination; lang: string; isRTL: boolean; fontFamily: string;
  onClose: () => void; onRideHere: (dest: ExploreDestination) => void;
}) {
  const color = CATEGORY_COLOR[dest.tag as Filter] ?? '#D4A843';
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)',
        borderTop: `2px solid ${color}44`,
        borderRadius: '24px 24px 0 0',
        padding: '0 0 32px',
        zIndex: 50,
        maxHeight: '85%',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 200 }}>
        <img src={dest.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,13,26,0.9) 0%, transparent 60%)' }} />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} color="white" />
        </button>
        {/* Category badge */}
        <span
          style={{
            position: 'absolute', bottom: 12, left: 12,
            background: color, color: '#0B1526', fontSize: 10, fontWeight: 800,
            padding: '3px 10px', borderRadius: 20, fontFamily,
          }}
        >
          {lang === 'ar' ? dest.tagAr : dest.tag}
        </span>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Name */}
        <h2 style={{ fontFamily, fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          {lang === 'ar' ? dest.nameAr : dest.nameEn}
        </h2>

        {/* Rating + price + open */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <StarRating rating={dest.rating} count={dest.reviewCount} lang={lang} />
          <PriceLevel level={dest.priceLevel} />
          {dest.openNow !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: dest.openNow ? '#34D399' : '#F87171',
            }}>
              {dest.openNow
                ? (lang === 'ar' ? '• مفتوح الآن' : '• Open now')
                : (lang === 'ar' ? '• مغلق' : '• Closed')}
            </span>
          )}
        </div>

        {/* Address */}
        {dest.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MapPin size={12} color="var(--text-tertiary)" />
            <span style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{dest.address}</span>
          </div>
        )}

        {/* Description */}
        <p style={{ fontFamily, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 20 }}>
          {lang === 'ar' ? dest.descAr : dest.descEn}
        </p>

        {/* Reviews header */}
        <div style={{ fontFamily, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', marginBottom: 12 }}>
          {lang === 'ar' ? 'آراء الزوار' : 'VISITOR REVIEWS'}
        </div>

        {/* Mock reviews */}
        {[
          { name: 'Ahmad K.', text: 'Amazing place, highly recommend visiting!', textAr: 'مكان رائع، أنصح بزيارته بشدة!', rating: 5, time: '2 days ago', timeAr: 'منذ يومين' },
          { name: 'Sara M.', text: 'Great atmosphere, will definitely come back.', textAr: 'أجواء رائعة، سأعود بالتأكيد.', rating: 4, time: '1 week ago', timeAr: 'منذ أسبوع' },
          { name: 'Khalid R.', text: 'A must-visit spot in Amman. Excellent experience.', textAr: 'مكان لا يمكن تفويته في عمّان. تجربة ممتازة.', rating: 5, time: '2 weeks ago', timeAr: 'منذ أسبوعين' },
        ].map((r, i) => (
          <div key={i} style={{
            background: 'var(--bg-input)', borderRadius: 12, padding: '10px 12px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily, fontWeight: 700, fontSize: 12.5, color: 'var(--text-primary)' }}>{r.name}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={9} color={s <= r.rating ? '#F59E0B' : 'rgba(255,255,255,0.2)'} fill={s <= r.rating ? '#F59E0B' : 'none'} />
                ))}
              </div>
            </div>
            <p style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.5 }}>
              {lang === 'ar' ? r.textAr : r.text}
            </p>
            <span style={{ fontFamily, fontSize: 10, color: 'var(--text-tertiary)' }}>
              {lang === 'ar' ? r.timeAr : r.time}
            </span>
          </div>
        ))}

        {/* Ride Here CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onRideHere(dest)}
          style={{
            width: '100%', marginTop: 16,
            background: 'linear-gradient(135deg, #D4A843 0%, #C49B2E 100%)',
            border: 'none', borderRadius: 18, padding: '16px 0',
            color: '#0B1526', fontWeight: 800, fontSize: 16,
            cursor: 'pointer', fontFamily,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Navigation size={18} />
          {lang === 'ar' ? 'اطلب رحلة إلى هنا' : 'Ride Here'}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function ExploreScreen({ onRideHere }: ExploreScreenProps) {
  const { lang, isRTL, t } = useLanguage();
  const fontFamily = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [selectedDest, setSelectedDest] = useState<ExploreDestination | null>(null);

  const filtered = activeFilter === 'all'
    ? EXPLORE_DESTINATIONS
    : EXPLORE_DESTINATIONS.filter(d => d.tag === activeFilter);

  function handleRideHere(dest: ExploreDestination) {
    setSelectedDest(null);
    const matchedPlace = AMMAN_PLACES.find(p =>
      Math.abs(p.coords[0] - dest.coords[0]) < 0.01 &&
      Math.abs(p.coords[1] - dest.coords[1]) < 0.01
    );
    if (matchedPlace) {
      onRideHere(matchedPlace);
    } else {
      const syntheticPlace: Place = {
        id: dest.id,
        nameEn: dest.nameEn,
        nameAr: dest.nameAr,
        addressEn: dest.address ?? `${dest.nameEn}, Jordan`,
        addressAr: dest.address ?? `${dest.nameAr}، الأردن`,
        coords: dest.coords,
        type: 'landmark',
      };
      onRideHere(syntheticPlace);
    }
  }

  // Featured top 4
  const featured = EXPLORE_DESTINATIONS.slice(0, 4);

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--bg-primary)', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Header */}
      <div
        className="px-4 wasel-safe-top pb-3"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 style={{ fontFamily, fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 2 }}>
          {t('exploreAmman')}
        </h1>
        <p style={{ fontFamily, fontSize: 13, color: 'var(--text-tertiary)' }}>
          {t('discoverJordan')}
        </p>
      </div>

      {/* Filter chips */}
      <div
        className="flex gap-2 px-4 py-2.5 overflow-x-auto"
        style={{ background: 'var(--bg-surface)', scrollbarWidth: 'none', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id;
          const color = CATEGORY_COLOR[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="rounded-full flex-shrink-0"
              style={{
                padding: '6px 12px',
                background: isActive ? `${color}20` : 'var(--chip-bg)',
                color: isActive ? color : 'var(--text-secondary)',
                border: isActive ? `1px solid ${color}55` : '1px solid var(--border)',
                fontFamily, fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span>{f.emoji}</span>
              {lang === 'ar' ? f.ar : f.en}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto wasel-scroll-pad" style={{ scrollbarWidth: 'none' }}>

        {/* Featured carousel — show when 'all' filter active */}
        {activeFilter === 'all' && (
          <div className="px-4 pt-4 pb-2">
            <span style={{ fontFamily, fontWeight: 700, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 10 }}>
              ✨ {lang === 'ar' ? 'مميز' : 'Featured'}
            </span>
            <div className="flex overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', marginLeft: -16, paddingLeft: 16 }}>
              {featured.map((dest, i) => {
                const color = CATEGORY_COLOR[dest.tag as Filter] ?? '#D4A843';
                return (
                  <motion.div
                    key={dest.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setSelectedDest(dest)}
                    className="rounded-2xl overflow-hidden relative flex-shrink-0"
                    style={{ width: 200, height: 140, marginRight: 12, cursor: 'pointer' }}
                  >
                    <img src={dest.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,13,26,0.92) 0%, rgba(6,13,26,0.08) 55%)' }} />
                    <span
                      className="absolute rounded-full"
                      style={{ [isRTL ? 'right' : 'left']: 8, top: 8, background: color, color: '#0B1526', fontSize: 9, fontWeight: 800, padding: '2px 8px', fontFamily }}
                    >
                      {lang === 'ar' ? dest.tagAr : dest.tag}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div style={{ fontFamily, fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.95)', lineHeight: 1.2, marginBottom: 4 }}>
                        {lang === 'ar' ? dest.nameAr : dest.nameEn}
                      </div>
                      <StarRating rating={dest.rating} count={dest.reviewCount} lang={lang} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* All destinations list */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily, fontWeight: 700, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {activeFilter === 'all' ? (lang === 'ar' ? 'جميع الأماكن' : 'All Places') : (lang === 'ar' ? FILTERS.find(f=>f.id===activeFilter)?.ar : FILTERS.find(f=>f.id===activeFilter)?.en)}
            </span>
            <span style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>{filtered.length}</span>
          </div>

          {filtered.map((dest, i) => {
            const color = CATEGORY_COLOR[dest.tag as Filter] ?? '#D4A843';
            return (
              <motion.div
                key={dest.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl overflow-hidden mb-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelectedDest(dest)}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: 120 }}>
                  <img src={dest.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,13,26,0.1) 0%, rgba(6,13,26,0.35) 100%)' }} />
                  <span style={{
                    position: 'absolute', [isRTL ? 'right' : 'left']: 10, top: 10,
                    background: `${color}CC`, backdropFilter: 'blur(8px)',
                    color: '#0B1526', fontSize: 9.5, fontWeight: 800,
                    padding: '2px 9px', borderRadius: 20, fontFamily,
                  }}>
                    {lang === 'ar' ? dest.tagAr : dest.tag}
                  </span>
                  {dest.openNow !== undefined && (
                    <span style={{
                      position: 'absolute', [isRTL ? 'left' : 'right']: 10, top: 10,
                      background: dest.openNow ? 'rgba(52,211,153,0.85)' : 'rgba(248,113,113,0.85)',
                      color: 'white', fontSize: 9, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 20, fontFamily,
                    }}>
                      {dest.openNow
                        ? (lang === 'ar' ? 'مفتوح' : 'Open')
                        : (lang === 'ar' ? 'مغلق' : 'Closed')}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>
                        {lang === 'ar' ? dest.nameAr : dest.nameEn}
                      </div>
                      <StarRating rating={dest.rating} count={dest.reviewCount} lang={lang} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <PriceLevel level={dest.priceLevel} />
                      <ChevronRight size={14} color="var(--text-tertiary)" />
                    </div>
                  </div>

                  {/* Short description */}
                  <p style={{ fontFamily, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: '6px 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {lang === 'ar' ? dest.descAr : dest.descEn}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {dest.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} color="var(--text-tertiary)" />
                        <span style={{ fontFamily, fontSize: 10.5, color: 'var(--text-tertiary)' }}>{dest.address}</span>
                      </div>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); handleRideHere(dest); }}
                      style={{
                        background: 'var(--accent-subtle)', border: '1px solid rgba(212,168,67,0.3)',
                        borderRadius: 12, padding: '6px 12px',
                        display: 'flex', alignItems: 'center', gap: 5,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <Navigation size={11} color="var(--accent)" />
                      <span style={{ fontFamily, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)' }}>
                        {lang === 'ar' ? 'اطلب رحلة' : 'Ride Here'}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="px-4 pb-4">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent-subtle)' }}
          >
            <div style={{ fontFamily, fontWeight: 800, fontSize: 20, color: 'var(--accent)', marginBottom: 4 }}>
              {lang === 'ar' ? 'واصل' : 'Wasel'}
            </div>
            <p style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {lang === 'ar' ? 'استكشف الأردن بأمان وراحة' : 'Explore Jordan safely & comfortably'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              {[
                { icon: '⚡', text: lang === 'ar' ? 'بدون زيادة أسعار' : 'No Surge' },
                { icon: '💵', text: lang === 'ar' ? 'ادفع نقداً' : 'Cash OK' },
                { icon: '⭐', text: lang === 'ar' ? 'سائقون موثوقون' : 'Rated Drivers' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontFamily, fontSize: 10, color: 'var(--text-secondary)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail sheet overlay */}
      {selectedDest && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setSelectedDest(null)}
        />
      )}
      <AnimatePresence>
        {selectedDest && (
          <PlaceDetail
            dest={selectedDest}
            lang={lang}
            isRTL={isRTL}
            fontFamily={fontFamily}
            onClose={() => setSelectedDest(null)}
            onRideHere={handleRideHere}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
