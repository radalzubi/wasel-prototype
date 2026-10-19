import React from 'react';

interface WaselWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'arabic' | 'latin';
  color?: string;
}

/**
 * Wasel brand wordmark.
 * Arabic portion uses "Tajawal" — a clean MENA-native geometric font
 * where each letter reads unmistakably as Arabic (و is clearly a waw, not a g).
 */
export function WaselWordmark({ size = 'md', variant = 'full', color }: WaselWordmarkProps) {
  const sizes = { sm: 18, md: 24, lg: 32 };
  const fs = sizes[size];

  const arabicStyle: React.CSSProperties = {
    fontFamily: "'Tajawal', 'Cairo', 'Noto Naskh Arabic', sans-serif",
    fontWeight: 800,
    fontSize: fs * 1.1,
    letterSpacing: '0.04em',
    color: color ?? 'var(--accent, #D4A843)',
    lineHeight: 1,
    direction: 'rtl',
    unicodeBidi: 'embed',
  };

  const latinStyle: React.CSSProperties = {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600,
    fontSize: fs * 0.72,
    letterSpacing: '0.13em',
    color: color ?? 'var(--accent, #D4A843)',
    lineHeight: 1,
    opacity: 0.75,
    textTransform: 'uppercase',
  };

  if (variant === 'arabic') {
    return (
      <span style={arabicStyle} lang="ar">
        واصل
      </span>
    );
  }

  if (variant === 'latin') {
    return <span style={latinStyle}>Wasel</span>;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={arabicStyle} lang="ar">واصل</span>
      <span
        style={{
          width: 1,
          height: fs * 0.65,
          background: color ? `${color}55` : 'rgba(212,168,67,0.35)',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={latinStyle}>WASEL</span>
    </span>
  );
}
