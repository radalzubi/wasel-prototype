import React from 'react';
import { motion } from 'motion/react';
import { Car, Newspaper, Compass, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type Tab = 'home' | 'news' | 'explore' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { isRTL } = useLanguage();
  const fontFamily = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';

  const tabs: { id: Tab; icon: React.ReactNode; labelEn: string; labelAr: string }[] = [
    { id: 'home',     icon: <Car size={22} strokeWidth={1.7} />,       labelEn: 'Ride',     labelAr: 'توصيل' },
    { id: 'news',     icon: <Newspaper size={22} strokeWidth={1.7} />, labelEn: 'News',     labelAr: 'أخبار' },
    { id: 'explore',  icon: <Compass size={22} strokeWidth={1.7} />,   labelEn: 'Explore',  labelAr: 'استكشف' },
    { id: 'settings', icon: <Settings size={22} strokeWidth={1.7} />,  labelEn: 'Settings', labelAr: 'إعدادات' },
  ];

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-stretch"
      style={{
        minHeight: 64,
        paddingBottom: 'var(--wasel-safe-bottom, 0px)',
        zIndex: 100,
        background: 'rgba(8, 8, 14, 0.97)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const label = isRTL ? tab.labelAr : tab.labelEn;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '8px 4px',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            {/* Active pill */}
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                style={{
                  position: 'absolute',
                  inset: '5px 6px',
                  borderRadius: 14,
                  background: 'rgba(212,168,67,0.11)',
                  border: '1px solid rgba(212,168,67,0.18)',
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}

            {/* Icon */}
            <motion.div
              animate={{
                color: isActive ? '#D4A843' : 'rgba(255,255,255,0.30)',
                y: isActive ? -1 : 0,
              }}
              transition={{ duration: 0.15 }}
              style={{ position: 'relative', zIndex: 1, lineHeight: 0 }}
            >
              {tab.icon}
            </motion.div>

            {/* Label */}
            <motion.span
              animate={{ color: isActive ? '#D4A843' : 'rgba(255,255,255,0.28)' }}
              transition={{ duration: 0.15 }}
              style={{
                fontFamily,
                fontSize: isRTL ? 10 : 10,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: isRTL ? 0 : '0.02em',
                position: 'relative',
                zIndex: 1,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
