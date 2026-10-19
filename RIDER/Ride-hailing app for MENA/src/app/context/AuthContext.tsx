/**
 * Rider AuthContext — manages rider session state.
 * Persists access_token + riderId to localStorage.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// In dev: use empty string so Vite proxy forwards /api/* to the backend.
// In production: use the env var.
const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');

interface RiderSession {
  riderId: string;
  phone: string;
  name: string;
  email: string;
  savedHome: SavedPlace | null;
  savedWork: SavedPlace | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SavedPlace {
  lat: number;
  lng: number;
  label: string;
  address?: string;
}

interface AuthContextValue {
  session: RiderSession | null;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  updateProfile: (fields: { name?: string; email?: string; savedHome?: SavedPlace | null; savedWork?: SavedPlace | null }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY   = 'wasel_rider_token';
const REFRESH_KEY = 'wasel_rider_refresh';
const RIDER_KEY   = 'wasel_rider_id';
const PHONE_KEY   = 'wasel_rider_phone';
const NAME_KEY    = 'wasel_rider_name';
const EMAIL_KEY   = 'wasel_rider_email';
const SAVED_HOME_KEY = 'wasel_rider_saved_home';
const SAVED_WORK_KEY = 'wasel_rider_saved_work';
const EXP_KEY     = 'wasel_rider_expires_at';

function parseStoredPlace(raw: string | null): SavedPlace | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedPlace>;
    if (
      typeof parsed.lat === 'number'
      && typeof parsed.lng === 'number'
      && typeof parsed.label === 'string'
      && parsed.label.trim()
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        label: parsed.label.trim(),
        address: typeof parsed.address === 'string' && parsed.address.trim() ? parsed.address.trim() : undefined,
      };
    }
  } catch {
    // ignore malformed local storage values
  }
  return null;
}

function normalizeSavedPlace(raw: unknown): SavedPlace | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
  const address = typeof candidate.address === 'string' ? candidate.address.trim() : '';
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null;
  return {
    lat,
    lng,
    label,
    address: address || undefined,
  };
}

async function apiPost(path: string, body: unknown, token?: string): Promise<Record<string, unknown>> {
  return apiRequest('POST', path, body, token);
}

async function apiRequest(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  token?: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(String((err as Record<string, unknown>).error ?? `HTTP ${res.status}`));
  }
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<RiderSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyProfile = useCallback((profile: Partial<Pick<RiderSession, 'name' | 'email' | 'savedHome' | 'savedWork'>>) => {
    if (profile.name !== undefined) {
      localStorage.setItem(NAME_KEY, profile.name);
    }
    if (profile.email !== undefined) {
      localStorage.setItem(EMAIL_KEY, profile.email);
    }
    if (profile.savedHome !== undefined) {
      if (profile.savedHome) localStorage.setItem(SAVED_HOME_KEY, JSON.stringify(profile.savedHome));
      else localStorage.removeItem(SAVED_HOME_KEY);
    }
    if (profile.savedWork !== undefined) {
      if (profile.savedWork) localStorage.setItem(SAVED_WORK_KEY, JSON.stringify(profile.savedWork));
      else localStorage.removeItem(SAVED_WORK_KEY);
    }
    setSession(prev => prev ? {
      ...prev,
      ...(profile.name !== undefined ? { name: profile.name } : {}),
      ...(profile.email !== undefined ? { email: profile.email } : {}),
      ...(profile.savedHome !== undefined ? { savedHome: profile.savedHome } : {}),
      ...(profile.savedWork !== undefined ? { savedWork: profile.savedWork } : {}),
    } : prev);
  }, []);

  const refreshProfile = useCallback(async (riderId: string, token: string) => {
    const profile = await apiRequest('GET', `/api/riders/${riderId}`, undefined, token);
    applyProfile({
      name: typeof profile.name === 'string' ? profile.name : '',
      email: typeof profile.email === 'string' ? profile.email : '',
      savedHome: normalizeSavedPlace(profile.saved_home),
      savedWork: normalizeSavedPlace(profile.saved_work),
    });
  }, [applyProfile]);

  useEffect(() => {
    const token   = localStorage.getItem(TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    const riderId = localStorage.getItem(RIDER_KEY);
    const phone   = localStorage.getItem(PHONE_KEY);
    const name    = localStorage.getItem(NAME_KEY) ?? '';
    const email   = localStorage.getItem(EMAIL_KEY) ?? '';
    const savedHome = parseStoredPlace(localStorage.getItem(SAVED_HOME_KEY));
    const savedWork = parseStoredPlace(localStorage.getItem(SAVED_WORK_KEY));
    const expiresAt = Number(localStorage.getItem(EXP_KEY) ?? 0);
    if (token && riderId && phone) {
      setSession({
        accessToken: token,
        refreshToken: refresh ?? '',
        riderId,
        phone,
        name,
        email,
        savedHome,
        savedWork,
        expiresAt: expiresAt || Math.floor(Date.now() / 1000) + 3300,
      });
      void refreshProfile(riderId, token).catch(() => {
        // keep stored profile values if backend profile refresh fails
      });
    }
    setIsLoading(false);
  }, [refreshProfile]);

  const sendOtp = useCallback(async (phone: string) => {
    await apiPost('/api/auth/send-otp', { phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const data = await apiPost('/api/auth/verify', { phone, token, role: 'rider' });
    const s = data.session as Record<string, unknown>;
    const u = data.user as Record<string, unknown>;

    const newSession: RiderSession = {
      riderId:      String(u.id),
      phone:        String(u.phone),
      name:         '',
      email:        '',
      savedHome:    null,
      savedWork:    null,
      accessToken:  String(s.access_token),
      refreshToken: String(s.refresh_token),
      expiresAt: Math.floor(Date.now() / 1000) + Number(s.expires_in ?? 3600),
    };
    localStorage.setItem(TOKEN_KEY,   String(s.access_token));
    localStorage.setItem(REFRESH_KEY, String(s.refresh_token));
    localStorage.setItem(RIDER_KEY,   String(u.id));
    localStorage.setItem(PHONE_KEY,   String(u.phone));
    localStorage.setItem(NAME_KEY, '');
    localStorage.setItem(EMAIL_KEY, '');
    localStorage.removeItem(SAVED_HOME_KEY);
    localStorage.removeItem(SAVED_WORK_KEY);
    localStorage.setItem(EXP_KEY, String(newSession.expiresAt));
    setSession(newSession);
    try {
      await refreshProfile(newSession.riderId, newSession.accessToken);
    } catch {
      // OTP login should still succeed even if profile hydration fails
    }
  }, [refreshProfile]);

  const updateProfile = useCallback(async (fields: { name?: string; email?: string; savedHome?: SavedPlace | null; savedWork?: SavedPlace | null }) => {
    applyProfile(fields);

    const riderId = localStorage.getItem(RIDER_KEY);
    const token   = localStorage.getItem(TOKEN_KEY);
    if (riderId) {
      try {
        await apiRequest('PATCH', `/api/riders/${riderId}`, {
          ...(fields.name !== undefined ? { name: fields.name } : {}),
          ...(fields.email !== undefined ? { email: fields.email } : {}),
          ...(fields.savedHome !== undefined ? { saved_home: fields.savedHome } : {}),
          ...(fields.savedWork !== undefined ? { saved_work: fields.savedWork } : {}),
        }, token ?? undefined);
      } catch (e) {
        console.warn('[Profile] could not persist rider profile to DB:', e);
      }
    }
  }, [applyProfile]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(RIDER_KEY);
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(SAVED_HOME_KEY);
    localStorage.removeItem(SAVED_WORK_KEY);
    localStorage.removeItem(EXP_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!session?.refreshToken) return;
    const interval = setInterval(async () => {
      const now = Math.floor(Date.now() / 1000);
      if (session.expiresAt - now > 300) return;
      try {
        const data = await apiPost('/api/auth/refresh', { refreshToken: session.refreshToken });
        const accessToken = String(data.access_token);
        const refreshToken = String(data.refresh_token);
        const expiresAt = Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600);
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_KEY, refreshToken);
        localStorage.setItem(EXP_KEY, String(expiresAt));
        setSession(prev => prev ? { ...prev, accessToken, refreshToken, expiresAt } : prev);
      } catch {
        // keep session; API failures are handled by calling screens.
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, isLoading, sendOtp, verifyOtp, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
