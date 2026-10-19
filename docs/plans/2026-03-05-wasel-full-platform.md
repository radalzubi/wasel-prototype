# Wasel Full Platform — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Transform the Wasel rider app into a dual-theme (auto light/dark) production-grade UI matching the TripGlide reference design, integrate Google Maps fully, add fluid screen-transition animations, update the logo to a geometric Arabic wordmark, and scaffold the complete two-sided platform architecture (driver app + backend + dispatch engine).

**Architecture:** Monorepo under `/Wasel CODE/` — rider app stays at its existing path, new `/driver_app/` (Vite+React), new `/backend/` (Express+TypeScript), shared types in `/shared/`. Design tokens live in the rider app's CSS and are the source of truth. The dispatch algorithm (already prototyped in `wasel_bmp/`) is ported into `/backend/dispatch_engine/`.

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind, Framer Motion, `@react-google-maps/api`, Reem Kufi (Arabic logo font), Express 4, Node 20, TypeScript throughout.

---

## PHASE 1 — Design System Foundation

### Task 1: Reem Kufi Font + WaselWordmark Component

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/styles/fonts.css`
- Create: `RIDER/Ride-hailing app for MENA/src/app/components/WaselWordmark.tsx`

**Step 1: Add Reem Kufi to fonts.css**

```css
/* Add to top of fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700;800&display=swap');
```

**Step 2: Create WaselWordmark component**

```tsx
// src/app/components/WaselWordmark.tsx
import React from 'react';

interface WaselWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'arabic' | 'latin';
  color?: string;
}

export function WaselWordmark({ size = 'md', variant = 'full', color }: WaselWordmarkProps) {
  const sizes = { sm: 18, md: 24, lg: 32 };
  const fs = sizes[size];

  const style: React.CSSProperties = {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: fs,
    letterSpacing: '0.02em',
    color: color ?? 'var(--accent)',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  if (variant === 'arabic') return <span style={style}>واصل</span>;
  if (variant === 'latin') return <span style={{ ...style, fontFamily: "'Sora', sans-serif" }}>Wasel</span>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ ...style, fontSize: fs * 1.1 }}>واصل</span>
      <span style={{
        width: 1, height: fs * 0.7,
        background: 'var(--border-strong)',
        display: 'inline-block',
      }} />
      <span style={{ ...style, fontFamily: "'Sora', sans-serif", fontSize: fs * 0.75, fontWeight: 500, opacity: 0.7, letterSpacing: '0.12em' }}>WASEL</span>
    </span>
  );
}
```

**Step 3: Verify font loads in browser**

Start dev server and check the Network tab for `Reem+Kufi` font request returning 200.

---

### Task 2: Dual-Theme Token System

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/styles/index.css`
- Create: `RIDER/Ride-hailing app for MENA/src/app/context/ThemeContext.tsx`
- Modify: `RIDER/Ride-hailing app for MENA/src/main.tsx`

**Step 1: Replace/extend index.css with theme token layers**

Add to `index.css` (keep existing keyframes, add below):

```css
/* ── LIGHT THEME (TripGlide-inspired) ──────────────── */
:root[data-theme="light"] {
  --bg-primary:    #F5F5F7;
  --bg-surface:    #FFFFFF;
  --bg-card:       #FFFFFF;
  --bg-sheet:      rgba(255,255,255,0.97);
  --bg-input:      #F0F0F2;
  --text-primary:  #111318;
  --text-secondary:#6B7280;
  --text-tertiary: #9CA3AF;
  --accent:        #C49B2E;
  --accent-subtle: rgba(196,155,46,0.10);
  --accent-text:   #7A5F1A;
  --border:        rgba(0,0,0,0.07);
  --border-strong: rgba(0,0,0,0.15);
  --shadow-sm:     0 2px 8px rgba(0,0,0,0.06);
  --shadow-md:     0 4px 20px rgba(0,0,0,0.09);
  --shadow-lg:     0 8px 40px rgba(0,0,0,0.12);
  --nav-bg:        rgba(255,255,255,0.96);
  --nav-blur:      blur(20px);
  --chip-active-bg:#111318;
  --chip-active-text:#FFFFFF;
  --chip-bg:       rgba(0,0,0,0.05);
  --pill-active:   #D4A843;
  --map-style:     light;
}

/* ── DARK THEME (Midnight Amman) ───────────────────── */
:root[data-theme="dark"] {
  --bg-primary:    #060D1A;
  --bg-surface:    rgba(6,13,26,0.98);
  --bg-card:       rgba(255,255,255,0.04);
  --bg-sheet:      rgba(6,13,26,0.96);
  --bg-input:      rgba(255,255,255,0.07);
  --text-primary:  rgba(255,255,255,0.92);
  --text-secondary:rgba(255,255,255,0.50);
  --text-tertiary: rgba(255,255,255,0.28);
  --accent:        #D4A843;
  --accent-subtle: rgba(212,168,67,0.12);
  --accent-text:   #D4A843;
  --border:        rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.18);
  --shadow-sm:     0 2px 8px rgba(0,0,0,0.3);
  --shadow-md:     0 4px 24px rgba(0,0,0,0.5);
  --shadow-lg:     0 8px 60px rgba(0,0,0,0.8);
  --nav-bg:        rgba(6,13,26,0.97);
  --nav-blur:      blur(32px);
  --chip-active-bg:#D4A843;
  --chip-active-text:#0B1526;
  --chip-bg:       rgba(255,255,255,0.07);
  --pill-active:   #D4A843;
  --map-style:     dark;
}
```

**Step 2: Create ThemeContext.tsx**

```tsx
// src/app/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const getSystemTheme = (): Theme =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [theme, setTheme] = useState<Theme>(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

**Step 3: Wrap app in ThemeProvider in main.tsx**

```tsx
// In main.tsx, wrap <App /> with <ThemeProvider>
import { ThemeProvider } from './app/context/ThemeContext';
// ...
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

**Step 4: Verify**

Run `npm run dev`. Open browser. Change system theme. Page background should auto-switch between `#F5F5F7` and `#060D1A`.

---

### Task 3: Screen Transition Animations

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/App.tsx`
- Create: `RIDER/Ride-hailing app for MENA/src/app/components/ScreenTransition.tsx`

**Step 1: Create ScreenTransition wrapper**

```tsx
// src/app/components/ScreenTransition.tsx
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

const NAV_ORDER = ['home', 'news', 'explore', 'settings'] as const;
type Screen = typeof NAV_ORDER[number];

interface Props {
  screen: Screen;
  children: React.ReactNode;
}

export function ScreenTransition({ screen, children }: Props) {
  const idx = NAV_ORDER.indexOf(screen);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screen}
        custom={idx}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Apply in App.tsx**

Wrap each rendered screen with `<ScreenTransition screen={activeScreen}>`:

```tsx
// In App.tsx render, replace the screen rendering with:
<div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
  <ScreenTransition screen={activeScreen}>
    {activeScreen === 'home' && <HomeScreen ... />}
    {activeScreen === 'news' && <NewsScreen ... />}
    {activeScreen === 'explore' && <ExploreScreen ... />}
    {activeScreen === 'settings' && <SettingsScreen ... />}
  </ScreenTransition>
</div>
```

**Step 3: Verify**

Switch between tabs in dev server — screens should slide in/out with opacity fade.

---

## PHASE 2 — Google Maps Integration

### Task 4: Install @react-google-maps/api

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/package.json`

**Step 1: Install the library**

```bash
cd "RIDER/Ride-hailing app for MENA" && npm install @react-google-maps/api
```

Expected: `@react-google-maps/api` appears in `package.json` dependencies.

**Step 2: Remove Leaflet (optional but clean)**

```bash
npm uninstall leaflet react-leaflet @types/leaflet
```

---

### Task 5: Google Maps Dark/Light Style Constants

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/config/maps.ts`

**Step 1: Replace maps.ts entirely**

```typescript
// src/app/config/maps.ts
export const mapsApiKey: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export const AMMAN_CENTER = { lat: 31.9539, lng: 35.9106 };

export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7f95' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2840' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1e3050' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243860' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2840' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070e1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#4a6080' }] },
];

export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d8e8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
];

export const MAP_OPTIONS_BASE: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  zoomControl: false,
};
```

---

### Task 6: HomeScreen — Replace Leaflet with Google Maps

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/screens/HomeScreen.tsx`

**Step 1: Read the current HomeScreen** (required before writing)

**Step 2: Replace Leaflet imports with Google Maps**

Replace all `import { MapContainer, TileLayer, ... } from 'react-leaflet'` with:

```tsx
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { mapsApiKey, AMMAN_CENTER, DARK_MAP_STYLE, LIGHT_MAP_STYLE, MAP_OPTIONS_BASE } from '../config/maps';
import { useTheme } from '../context/ThemeContext';
```

**Step 3: Replace map rendering**

Inside HomeScreen component, add at top:

```tsx
const { theme } = useTheme();
const { isLoaded } = useJsApiLoader({
  id: 'wasel-google-map',
  googleMapsApiKey: mapsApiKey,
  libraries: ['places'],
});
```

Replace `<MapContainer>` JSX with:

```tsx
{isLoaded ? (
  <GoogleMap
    mapContainerStyle={{ width: '100%', height: '100%' }}
    center={driverLocation ?? AMMAN_CENTER}
    zoom={15}
    options={{
      ...MAP_OPTIONS_BASE,
      styles: theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
    }}
  >
    {/* Pickup marker */}
    {pickupCoords && (
      <Marker
        position={pickupCoords}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#60A5FA',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }}
      />
    )}
    {/* Destination marker */}
    {destinationCoords && (
      <Marker
        position={destinationCoords}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#D4A843',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }}
      />
    )}
    {/* Driver marker */}
    {driverLocation && (
      <Marker
        position={driverLocation}
        icon={{
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="#0D1F3C" stroke="#D4A843" stroke-width="2"/>
              <text x="16" y="21" text-anchor="middle" font-size="14">🚗</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        }}
      />
    )}
    {/* Route */}
    {directions && (
      <DirectionsRenderer
        directions={directions}
        options={{
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#D4A843',
            strokeWeight: 4,
            strokeOpacity: 0.85,
          },
        }}
      />
    )}
  </GoogleMap>
) : (
  <div style={{ width: '100%', height: '100%', background: 'var(--bg-primary)', display: 'grid', placeItems: 'center' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading map…</span>
  </div>
)}
```

**Step 4: Wire Directions API for route calculation**

Add state + effect:

```tsx
const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

useEffect(() => {
  if (!isLoaded || !pickupCoords || !destinationCoords) return;
  const svc = new google.maps.DirectionsService();
  svc.route({
    origin: pickupCoords,
    destination: destinationCoords,
    travelMode: google.maps.TravelMode.DRIVING,
  }, (result, status) => {
    if (status === 'OK' && result) setDirections(result);
  });
}, [isLoaded, pickupCoords, destinationCoords]);
```

**Step 5: Build check**

```bash
cd "RIDER/Ride-hailing app for MENA" && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors.

---

## PHASE 3 — Rider App UI Redesign (Dual Theme)

### Task 7: BottomNav — TripGlide-Inspired Redesign

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/components/BottomNav.tsx`

**Step 1: Read current BottomNav.tsx**

**Step 2: Rewrite with theme tokens + WaselWordmark**

Key changes:
- Background: `var(--nav-bg)` with `backdrop-filter: var(--nav-blur)`
- Active item: filled pill background `var(--chip-active-bg)` with `var(--chip-active-text)`
- Icons: 22px, label only shown on active item (TripGlide style)
- Add `WaselWordmark` as small top-center header above phone frame

```tsx
// Key nav item render pattern:
<motion.button
  key={item.id}
  onClick={() => onNavigate(item.id)}
  style={{
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 4, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer',
    color: active === item.id ? 'var(--chip-active-text)' : 'var(--text-secondary)',
    position: 'relative',
  }}
>
  {active === item.id && (
    <motion.div
      layoutId="nav-pill"
      style={{
        position: 'absolute', inset: '4px 8px',
        background: 'var(--chip-active-bg)',
        borderRadius: 12,
        zIndex: -1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    />
  )}
  <Icon size={20} />
  <AnimatePresence>
    {active === item.id && (
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}
      >
        {item.label}
      </motion.span>
    )}
  </AnimatePresence>
</motion.button>
```

---

### Task 8: HomeScreen — Dual-Theme Bottom Sheet

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/screens/HomeScreen.tsx`

**Step 1: Replace hardcoded color values with CSS vars**

Replace all `rgba(6,13,26,...)` → `var(--bg-sheet)`
Replace all `rgba(255,255,255,0.92)` → `var(--text-primary)`
Replace all `rgba(255,255,255,0.5)` → `var(--text-secondary)`
Replace all `rgba(255,255,255,0.04)` → `var(--bg-card)`
Replace all `rgba(255,255,255,0.08)` → `var(--border)`
Replace all `rgba(0,0,0,0.8)` shadow → `var(--shadow-lg)` (use box-shadow)

**Step 2: Update search bar to TripGlide pill style**

```tsx
// Search input container
<div style={{
  background: 'var(--bg-input)',
  borderRadius: 50,
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
}}>
  <Search size={16} color="var(--text-secondary)" />
  <input
    placeholder={t('whereTo')}
    style={{
      background: 'none', border: 'none', outline: 'none',
      color: 'var(--text-primary)', fontFamily,
      fontSize: 15, flex: 1,
    }}
  />
</div>
```

**Step 3: Quick-destination cards → TripGlide card style**

```tsx
// Card style using tokens
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  boxShadow: 'var(--shadow-sm)',
};
```

---

### Task 9: ExploreScreen — Dual-Theme Redesign

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/screens/ExploreScreen.tsx`

**Step 1: Read ExploreScreen.tsx**

**Step 2: Replace all hardcoded colors with tokens**

- `#060D1A` → `var(--bg-primary)`
- `linear-gradient(180deg, #0D1F3C 0%, ...)` → `var(--bg-surface)` (simplify header)
- Filter chip active: `background: 'var(--chip-active-bg)', color: 'var(--chip-active-text)'`
- Filter chip inactive: `background: 'var(--chip-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)'`
- "Ride Here" button: `background: 'var(--accent-subtle)', color: 'var(--accent-text)'`

**Step 3: Featured cards — add proper drop shadow for light mode**

```tsx
// Featured card container
<motion.div style={{
  borderRadius: 20,
  overflow: 'hidden',
  boxShadow: 'var(--shadow-md)',
  flex: '0 0 200px',
}} ... >
```

---

### Task 10: NewsScreen + SettingsScreen — Dual-Theme Tokens

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/screens/NewsScreen.tsx`
- Modify: `RIDER/Ride-hailing app for MENA/src/app/screens/SettingsScreen.tsx`

**Step 1: Apply same token replacement pattern as Task 8/9**

NewsScreen replacements:
- Header: `background: 'var(--bg-surface)'`
- Article cards: `background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'`
- Ad banners: `background: 'var(--bg-card)', border: '1px solid var(--accent-subtle)'`

SettingsScreen replacements:
- All section cards: `background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)'`
- Row items: `background: 'var(--bg-card)'`
- Toggle track (off): `rgba(255,255,255,0.12)` → `'var(--border-strong)'`

**Step 2: Add theme toggle switch to SettingsScreen**

Find the Appearance section, add a "Theme" row that calls `toggleTheme()` from `useTheme()`.

**Step 3: Verify all screens render correctly in both themes**

Toggle system appearance — all screens should flip gracefully.

---

### Task 11: MobileFrame — Dual-Theme Background

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/src/app/components/MobileFrame.tsx`

**Step 1: Read MobileFrame.tsx**

**Step 2: Use `useTheme()` to switch background**

```tsx
const { theme } = useTheme();
const outerBg = theme === 'dark'
  ? 'radial-gradient(ellipse 80% 60% at 50% 30%, #0D1F3C 0%, #060D1A 50%, #030810 100%)'
  : 'radial-gradient(ellipse 80% 60% at 50% 30%, #E8EDF5 0%, #F0F2F7 50%, #F5F5F7 100%)';
```

**Step 3: Add WaselWordmark below phone frame**

Replace static `WASEL · واصل — AMMAN, JORDAN` text with:

```tsx
import { WaselWordmark } from './WaselWordmark';
// ...
<WaselWordmark size="sm" variant="full" color="var(--text-tertiary)" />
```

---

## PHASE 4 — Architecture Scaffold

### Task 12: Repo Root Structure

**Files:**
- Create: `/Users/radalzubi/Desktop/Wasel CODE/package.json` (root monorepo)
- Create: `/Users/radalzubi/Desktop/Wasel CODE/.gitignore`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/README.md`

**Step 1: Create root package.json**

```json
{
  "name": "wasel-platform",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["shared", "RIDER/Ride-hailing app for MENA"],
  "scripts": {
    "rider": "npm -w 'RIDER/Ride-hailing app for MENA' run dev",
    "driver": "npm -w driver_app run dev",
    "backend": "npm -w backend run dev"
  }
}
```

**Step 2: Create .gitignore at root**

```
node_modules/
dist/
.env
.env.local
.env.*.local
*.DS_Store
```

---

### Task 13: Shared Types Package

**Files:**
- Create: `/Users/radalzubi/Desktop/Wasel CODE/shared/package.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/shared/src/types/index.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/shared/src/types/trip.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/shared/src/types/driver.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/shared/src/types/rider.ts`

**Step 1: shared/package.json**

```json
{
  "name": "@wasel/shared",
  "version": "0.1.0",
  "main": "src/types/index.ts",
  "types": "src/types/index.ts"
}
```

**Step 2: shared/src/types/trip.ts**

```typescript
export type TripStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DRIVER_EN_ROUTE'
  | 'PASSENGER_PICKED_UP'
  | 'TRIP_IN_PROGRESS'
  | 'TRIP_COMPLETED'
  | 'CANCELLED';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: Coordinates;
  destination: Coordinates;
  pickupAddress: string;
  destinationAddress: string;
  status: TripStatus;
  tier: 'normal' | 'comfort';
  estimatedFare: number;
  actualFare?: number;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  route?: Coordinates[];
}
```

**Step 3: shared/src/types/driver.ts**

```typescript
export type SubscriptionTier = 1 | 2 | 3;

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePlate: string;
  vehicleColor: string;
  rating: number;
  totalTrips: number;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: number;
  isOnline: boolean;
  isAvailable: boolean;
  location?: { lat: number; lng: number };
  acceptanceRate: number;
  cancellationRate: number;
  lastActivityAt: number;
  idleStartedAt?: number;
  verificationStatus: 'pending' | 'approved' | 'rejected';
}
```

**Step 4: shared/src/types/rider.ts**

```typescript
export interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rating: number;
  totalTrips: number;
  savedPlaces: Array<{ label: string; address: string; coords: { lat: number; lng: number } }>;
  preferredLang: 'en' | 'ar';
  createdAt: number;
}
```

**Step 5: shared/src/types/index.ts**

```typescript
export * from './trip';
export * from './driver';
export * from './rider';
```

---

### Task 14: Backend — Express API Scaffold

**Files:**
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/package.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/tsconfig.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/index.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/routes/trips.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/routes/drivers.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/routes/auth.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/middleware/cors.ts`

**Step 1: backend/package.json**

```json
{
  "name": "@wasel/backend",
  "version": "0.1.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

**Step 2: backend/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import { tripRoutes } from './routes/trips';
import { driverRoutes } from './routes/drivers';
import { authRoutes } from './routes/auth';

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/drivers', driverRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'wasel-backend', version: '0.1.0' }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`🚗 Wasel backend running on port ${PORT}`));
```

**Step 3: backend/src/routes/trips.ts**

```typescript
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { Trip } from '../../../shared/src/types';

const router = Router();

// In-memory store (replace with DB)
const trips = new Map<string, Trip>();

// POST /api/trips — create ride request
router.post('/', (req, res) => {
  const trip: Trip = {
    id: uuid(),
    riderId: req.body.riderId,
    pickup: req.body.pickup,
    destination: req.body.destination,
    pickupAddress: req.body.pickupAddress,
    destinationAddress: req.body.destinationAddress,
    tier: req.body.tier ?? 'normal',
    status: 'REQUESTED',
    estimatedFare: calculateFare(req.body.pickup, req.body.destination),
    createdAt: Date.now(),
  };
  trips.set(trip.id, trip);
  res.status(201).json(trip);
});

// GET /api/trips/:id
router.get('/:id', (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

// PATCH /api/trips/:id/status
router.patch('/:id/status', (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  trip.status = req.body.status;
  if (req.body.driverId) trip.driverId = req.body.driverId;
  trips.set(trip.id, trip);
  res.json(trip);
});

function calculateFare(pickup: {lat:number,lng:number}, dest: {lat:number,lng:number}): number {
  const R = 6371;
  const dLat = (dest.lat - pickup.lat) * Math.PI / 180;
  const dLng = (dest.lng - pickup.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(pickup.lat*Math.PI/180) * Math.cos(dest.lat*Math.PI/180) * Math.sin(dLng/2)**2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const BASE = 0.5; // JD
  const PER_KM = 0.25; // JD
  return Math.round((BASE + distKm * PER_KM) * 100) / 100;
}

export { router as tripRoutes };
```

**Step 4: Install backend deps**

```bash
cd /Users/radalzubi/Desktop/Wasel\ CODE/backend && npm install
```

---

### Task 15: Dispatch Engine — BMP Algorithm Port

**Files:**
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/dispatch_engine/index.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/dispatch_engine/scoring.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/backend/src/dispatch_engine/geo.ts`

**Step 1: geo.ts — Haversine + Geohash utilities**

```typescript
// dispatch_engine/geo.ts
export interface LatLng { lat: number; lng: number; }

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

export function driversWithinRadius(
  drivers: Array<{ id: string; location: LatLng }>,
  center: LatLng,
  radiusKm: number
): string[] {
  return drivers
    .filter(d => haversineKm(d.location, center) <= radiusKm)
    .map(d => d.id);
}
```

**Step 2: scoring.ts — BMP Driver Scoring Formula**

```typescript
// dispatch_engine/scoring.ts
// Formula: score = (w1*proximity) + (w2*subscriptionPriority) + (w3*activityScore) + (w4*idleBonus)
import type { Driver } from '../../../shared/src/types';
import { haversineKm, LatLng } from './geo';

const WEIGHTS = { proximity: 0.4, subscription: 0.3, activity: 0.2, idle: 0.1 };

const TIER_WEIGHT: Record<1|2|3, number> = { 1: 0.4, 2: 0.7, 3: 1.0 };

export function scoreDriver(driver: Driver, riderLocation: LatLng, now = Date.now()): number {
  if (!driver.isOnline || !driver.isAvailable || !driver.location) return -1;

  // 1. Proximity (closer = higher, max 1.0 at 0km, 0 at 5km)
  const distKm = haversineKm(driver.location, riderLocation);
  const proximityScore = Math.max(0, 1 - distKm / 5);

  // 2. Subscription priority
  const subscriptionScore = TIER_WEIGHT[driver.subscriptionTier];

  // 3. Activity score (acceptance - cancellation rate, normalized)
  const activityScore = Math.max(0, Math.min(1, driver.acceptanceRate - driver.cancellationRate));

  // 4. Idle time bonus (max bonus after 10 minutes idle)
  const idleMins = driver.idleStartedAt ? (now - driver.idleStartedAt) / 60000 : 0;
  const idleBonus = Math.min(1, idleMins / 10);

  // Fairness: diminishing returns if consecutive assignments (stub — implement with Redis counter)
  const rawScore =
    WEIGHTS.proximity * proximityScore +
    WEIGHTS.subscription * subscriptionScore +
    WEIGHTS.activity * activityScore +
    WEIGHTS.idle * idleBonus;

  return Math.round(rawScore * 1000) / 1000;
}

export function rankDrivers(
  drivers: Driver[],
  riderLocation: LatLng
): Array<{ driverId: string; score: number }> {
  return drivers
    .map(d => ({ driverId: d.id, score: scoreDriver(d, riderLocation) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
```

**Step 3: dispatch_engine/index.ts**

```typescript
// dispatch_engine/index.ts
import type { Trip, Driver } from '../../../shared/src/types';
import { driversWithinRadius } from './geo';
import { rankDrivers } from './scoring';

export interface DispatchResult {
  tripId: string;
  rankedDrivers: Array<{ driverId: string; score: number }>;
  offeredTo?: string;
}

export function dispatch(trip: Trip, availableDrivers: Driver[]): DispatchResult {
  const nearbyIds = driversWithinRadius(
    availableDrivers.filter(d => d.location).map(d => ({ id: d.id, location: d.location! })),
    trip.pickup,
    5 // 5km search radius
  );

  const nearbyDrivers = availableDrivers.filter(d => nearbyIds.includes(d.id));
  const ranked = rankDrivers(nearbyDrivers, trip.pickup);

  return {
    tripId: trip.id,
    rankedDrivers: ranked,
    offeredTo: ranked[0]?.driverId,
  };
}
```

---

### Task 16: Driver App Shell

**Files:**
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/package.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/index.html`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/vite.config.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/main.tsx`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/App.tsx`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/screens/OnboardingScreen.tsx`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/screens/DashboardScreen.tsx`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/screens/RideOfferScreen.tsx`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/screens/NavigationScreen.tsx`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/screens/SubscriptionScreen.tsx`

**Step 1: driver_app/package.json**

```json
{
  "name": "@wasel/driver-app",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 4174"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "motion": "^12.0.0",
    "@react-google-maps/api": "^2.20.3",
    "lucide-react": "^0.514.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.0"
  }
}
```

**Step 2: driver_app/src/App.tsx — screen state machine**

```tsx
import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { RideOfferScreen } from './screens/RideOfferScreen';
import { NavigationScreen } from './screens/NavigationScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';

type DriverScreen = 'onboarding' | 'dashboard' | 'ride_offer' | 'navigation' | 'subscription';

export default function App() {
  const [screen, setScreen] = useState<DriverScreen>('onboarding');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#060D1A', overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="wait">
        {screen === 'onboarding' && <OnboardingScreen key="onboarding" onComplete={() => setScreen('dashboard')} />}
        {screen === 'dashboard' && <DashboardScreen key="dashboard" onNewRide={() => setScreen('ride_offer')} onSubscription={() => setScreen('subscription')} />}
        {screen === 'ride_offer' && <RideOfferScreen key="ride_offer" onAccept={() => setScreen('navigation')} onDecline={() => setScreen('dashboard')} />}
        {screen === 'navigation' && <NavigationScreen key="navigation" onComplete={() => setScreen('dashboard')} />}
        {screen === 'subscription' && <SubscriptionScreen key="subscription" onBack={() => setScreen('dashboard')} />}
      </AnimatePresence>
    </div>
  );
}
```

**Step 3: DashboardScreen.tsx skeleton**

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { Car, Star, DollarSign, TrendingUp, Bell } from 'lucide-react';

interface Props {
  onNewRide: () => void;
  onSubscription: () => void;
}

const MOCK_DRIVER = {
  name: 'Ahmad Al-Rashidi', tier: 3, ridesCompleted: 47,
  earningsToday: 28.5, acceptanceRate: 94, isOnline: true,
};

export function DashboardScreen({ onNewRide, onSubscription }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ height: '100%', background: '#060D1A', color: 'white', padding: 24, overflowY: 'auto' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Reem Kufi', sans-serif", color: '#D4A843' }}>واصل Driver</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Good morning, Ahmad</div>
        </div>
        <button onClick={onNewRide} style={{
          background: '#D4A843', color: '#0B1526', borderRadius: 20, padding: '8px 16px',
          border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>
          {MOCK_DRIVER.isOnline ? '🟢 Online' : '🔴 Go Online'}
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { icon: Car, label: 'Rides Today', value: MOCK_DRIVER.ridesCompleted },
          { icon: DollarSign, label: 'Earnings (JD)', value: MOCK_DRIVER.earningsToday.toFixed(2) },
          { icon: Star, label: 'Acceptance %', value: MOCK_DRIVER.acceptanceRate + '%' },
          { icon: TrendingUp, label: 'Tier', value: `Tier ${MOCK_DRIVER.tier}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: 16,
          }}>
            <Icon size={18} color="#D4A843" />
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Subscription CTA */}
      <button onClick={onSubscription} style={{
        width: '100%', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)',
        borderRadius: 16, padding: 16, color: '#D4A843', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        textAlign: 'left',
      }}>
        🏆 Tier 3 — Gold Subscription · Renews in 18 days →
      </button>
    </motion.div>
  );
}
```

**Step 4: SubscriptionScreen.tsx — tier cards**

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

const TIERS = [
  { tier: 1, name: 'Silver', price: 15, priority: 'Base', color: '#94A3B8', perks: ['Standard ride matching', 'Basic support', 'Weekly payouts'] },
  { tier: 2, name: 'Gold', price: 35, priority: 'Priority', color: '#D4A843', perks: ['Priority ride matching', 'Dedicated support', 'Daily payouts', '+15% more rides'] },
  { tier: 3, name: 'Platinum', price: 60, priority: 'Top', color: '#A78BFA', perks: ['Top-tier matching', '24/7 VIP support', 'Instant payouts', '+35% more rides', 'Monthly bonuses'] },
];

export function SubscriptionScreen({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ height: '100%', background: '#060D1A', color: 'white', padding: 24, overflowY: 'auto' }}
    >
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={24} />
      </button>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Reem Kufi', sans-serif", marginBottom: 4 }}>Choose Your Tier</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Higher tier = more rides + priority dispatch</div>

      {TIERS.map(t => (
        <div key={t.tier} style={{
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.color}33`,
          borderLeft: `3px solid ${t.color}`, borderRadius: 16, padding: 20, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: t.color, fontWeight: 700, fontSize: 18 }}>{t.name}</span>
            <span style={{ color: t.color, fontWeight: 700 }}>{t.price} JD/mo</span>
          </div>
          {t.perks.map(p => <div key={p} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>✓ {p}</div>)}
          <button style={{
            width: '100%', marginTop: 12, background: t.color, color: '#0B1526',
            border: 'none', borderRadius: 10, padding: '10px 0', fontWeight: 700, cursor: 'pointer',
          }}>
            Select {t.name}
          </button>
        </div>
      ))}
    </motion.div>
  );
}
```

---

### Task 17: Launch Configuration & Local Run Setup

**Files:**
- Modify: `RIDER/Ride-hailing app for MENA/.claude/launch.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/.claude/launch.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/index.html`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/vite.config.ts`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/tsconfig.json`
- Create: `/Users/radalzubi/Desktop/Wasel CODE/driver_app/src/main.tsx`

**Step 1: driver_app/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wasel Driver</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;600;700&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: driver_app/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
});
```

**Step 3: driver_app/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020", "useDefineForClassFields": true,
    "lib": ["ES2020","DOM","DOM.Iterable"], "module": "ESNext",
    "skipLibCheck": true, "moduleResolution": "bundler",
    "allowImportingTsExtensions": true, "isolatedModules": true,
    "moduleDetection": "force", "noEmit": true,
    "jsx": "react-jsx", "strict": true
  },
  "include": ["src"]
}
```

**Step 4: driver_app/src/main.tsx**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

**Step 5: Install driver app deps**

```bash
cd "/Users/radalzubi/Desktop/Wasel CODE/driver_app" && npm install
```

**Step 6: Verify both apps run**

```bash
# Terminal 1
cd "RIDER/Ride-hailing app for MENA" && npm run dev
# → http://localhost:5173

# Terminal 2
cd driver_app && npm run dev
# → http://localhost:5174
```

---

### Task 18: Final Build Verification

**Step 1: Rider app build**

```bash
cd "/Users/radalzubi/Desktop/Wasel CODE/RIDER/Ride-hailing app for MENA" && npm run build 2>&1 | tail -30
```

Expected: 0 TypeScript errors.

**Step 2: Driver app build**

```bash
cd "/Users/radalzubi/Desktop/Wasel CODE/driver_app" && npm run build 2>&1 | tail -20
```

Expected: 0 TypeScript errors.

**Step 3: Screenshot both apps in light + dark mode**

Take preview screenshots confirming:
- Rider app: light theme with Google Maps, TripGlide card layout, Reem Kufi logo
- Driver app: dark, tier subscription cards, ride offer screen
- Tab transitions: smooth AnimatePresence slide

---

## Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────┐
│                      WASEL PLATFORM                         │
├─────────────────┬───────────────────┬───────────────────────┤
│   RIDER APP     │    DRIVER APP     │       BACKEND         │
│  :5173          │    :5174          │       :3001           │
│                 │                   │                       │
│  HomeScreen     │  OnboardingScreen │  POST /api/trips      │
│  ExploreScreen  │  DashboardScreen  │  GET  /api/trips/:id  │
│  NewsScreen     │  RideOfferScreen  │  PATCH /api/trips/:id │
│  SettingsScreen │  NavigationScreen │  GET  /api/drivers    │
│                 │  SubscriptionScr. │  POST /api/auth       │
│                 │                   │                       │
│  Google Maps    │  Google Maps      │  ┌─ dispatch_engine ─┐│
│  ThemeContext   │  BMP dispatch     │  │  scoring.ts       ││
│  LanguageCtx   │  Subscription     │  │  geo.ts           ││
│                 │  tiers 1/2/3      │  │  index.ts         ││
├─────────────────┴───────────────────┤  └───────────────────┘│
│              SHARED                 │                       │
│  types/trip.ts  types/driver.ts     │  ┌─ algorithms ──────┐│
│  types/rider.ts types/index.ts      │  │  BMP scoring      ││
│                                     │  │  fairness balance ││
│                                     │  └───────────────────┘│
└─────────────────────────────────────┴───────────────────────┘
```
