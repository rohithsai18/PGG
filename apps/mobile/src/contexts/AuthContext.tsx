import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { apiFetch } from '../lib/api';
import { AuthState, UserDTO } from '../types';

type AuthContextType = AuthState & {
  loading: boolean;
  requestOtp: (phone: string) => Promise<{ requestId: string; demoOtpHint?: string }>;
  verifyOtp: (phone: string, requestId: string, otp: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await storage.getSession();
      setToken(session.token ?? null);
      setUser(session.user);
      setLoading(false);
    })();
  }, []);

  const requestOtp = (phone: string) => {
    return apiFetch<{ requestId: string; demoOtpHint?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  };

  const verifyOtp = async (phone: string, requestId: string, otp: string) => {
    const data = await apiFetch<{ accessToken: string; user: UserDTO }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, requestId, otp })
    });

    setToken(data.accessToken);
    setUser(data.user);
    await storage.setSession(data.accessToken, data.user);
  };

  const refreshProfile = async () => {
    if (!token) {
      return;
    }
    const profile = await apiFetch<UserDTO>('/me', {}, token);
    setUser(profile);
    await storage.setSession(token, profile);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await storage.clearSession();
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, requestOtp, verifyOtp, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
