import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { WaselWordmark } from './WaselWordmark';

interface MobileFrameProps {
  children: ReactNode;
  isRTL: boolean;
}

export function MobileFrame({ children, isRTL }: MobileFrameProps) {
  const { theme } = useTheme();
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 860 : true
  );

  useEffect(() => {
    const onResize = () => setIsCompactViewport(window.innerWidth <= 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isNative = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const maybeCapacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (maybeCapacitor?.isNativePlatform?.()) return true;
    const ua = window.navigator.userAgent || '';
    return /iPhone|iPad|Android/i.test(ua);
  }, []);

  const responsiveShellStyle = {
    '--wasel-safe-top': 'env(safe-area-inset-top, 0px)',
    '--wasel-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
    '--wasel-safe-left': 'env(safe-area-inset-left, 0px)',
    '--wasel-safe-right': 'env(safe-area-inset-right, 0px)',
    minHeight: '100dvh',
    width: '100%',
    background: 'var(--bg-deep, #060D1A)',
    direction: isRTL ? 'rtl' : 'ltr',
  } as React.CSSProperties;

  if (isNative || isCompactViewport) {
    return (
      <div style={responsiveShellStyle} dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{
        background: theme === 'dark'
          ? '#050505'
          : '#F0F0F0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow effects */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(0,0,0,0) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 35% at 80% 20%, rgba(212,168,67,0.06) 0%, transparent 70%)',
      }} />

      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.015,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Phone frame */}
      <div
        className="relative rounded-[3rem] overflow-hidden"
        style={{
          width: 390,
          height: 844,
          background: '#000',
          '--wasel-safe-top': 'env(safe-area-inset-top, 0px)',
          '--wasel-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
          '--wasel-safe-left': 'env(safe-area-inset-left, 0px)',
          '--wasel-safe-right': 'env(safe-area-inset-right, 0px)',
          boxShadow: theme === 'dark'
            ? [
                '0 0 0 1px rgba(255,255,255,0.08)',
                '0 0 0 3px rgba(0,0,0,0.9)',
                '0 0 80px rgba(212,168,67,0.08)',
                '0 40px 120px rgba(0,0,0,0.9)',
                '0 0 200px rgba(27,58,92,0.2)',
              ].join(', ')
            : [
                '0 0 0 1px rgba(0,0,0,0.12)',
                '0 0 0 3px rgba(0,0,0,0.06)',
                '0 40px 80px rgba(0,0,0,0.15)',
                '0 10px 40px rgba(0,0,0,0.1)',
              ].join(', '),
        }}
      >
        {/* Phone edge shine */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '3rem', pointerEvents: 'none', zIndex: 200,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)',
        }} />

        {/* Screen */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            borderRadius: '2.8rem',
            background: 'var(--bg-deep, #060D1A)',
            direction: isRTL ? 'rtl' : 'ltr',
          }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {children}
        </div>

      </div>

      {/* Branding below phone */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <WaselWordmark size="sm" variant="full" color="var(--text-tertiary)" />
      </div>
    </div>
  );
}
