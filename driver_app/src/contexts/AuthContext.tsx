/**
 * AuthContext — manages driver session state.
 *
 * Persists access_token + driverId to localStorage.
 * Exposes login (OTP send+verify) and logout helpers.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface DriverSession {
  driverId: string;
  phone: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthContextValue {
  session: DriverSession | null;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY   = 'wasel_driver_token';
const REFRESH_KEY = 'wasel_driver_refresh';
const DRIVER_KEY  = 'wasel_driver_id';
const PHONE_KEY   = 'wasel_driver_phone';
const EXP_KEY     = 'wasel_driver_expires_at';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token      = localStorage.getItem(TOKEN_KEY);
    const refresh    = localStorage.getItem(REFRESH_KEY);
    const driverId   = localStorage.getItem(DRIVER_KEY);
    const phone      = localStorage.getItem(PHONE_KEY);
    const expiresAt  = Number(localStorage.getItem(EXP_KEY) ?? 0);

    if (token && driverId && phone) {
      setSession({
        accessToken: token,
        refreshToken: refresh ?? '',
        driverId,
        phone,
        expiresAt: expiresAt || Math.floor(Date.now() / 1000) + 3300,
      });
    }
    setIsLoading(false);
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await api.sendOtp(phone);
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { session: s, user } = await api.verifyOtp(phone, token);

    const newSession: DriverSession = {
      driverId:     user.id,
      phone:        user.phone,
      accessToken:  s.access_token,
      refreshToken: s.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + Number(s.expires_in ?? 3600),
    };

    // Persist
    localStorage.setItem(TOKEN_KEY,   s.access_token);
    localStorage.setItem(REFRESH_KEY, s.refresh_token);
    localStorage.setItem(DRIVER_KEY,  user.id);
    localStorage.setItem(PHONE_KEY,   user.phone);
    localStorage.setItem(EXP_KEY, String(newSession.expiresAt));

    setSession(newSession);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(DRIVER_KEY);
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(EXP_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!session?.refreshToken) return;
    const interval = setInterval(async () => {
      const now = Math.floor(Date.now() / 1000);
      if (session.expiresAt - now > 300) return;
      try {
        const fresh = await api.refreshToken(session.refreshToken);
        const expiresAt = Math.floor(Date.now() / 1000) + Number(fresh.expires_in ?? 3600);
        localStorage.setItem(TOKEN_KEY, fresh.access_token);
        localStorage.setItem(REFRESH_KEY, fresh.refresh_token);
        localStorage.setItem(EXP_KEY, String(expiresAt));
        setSession(prev => prev ? {
          ...prev,
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token,
          expiresAt,
        } : prev);
      } catch {
        // keep current session and let API failures surface naturally
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, isLoading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
