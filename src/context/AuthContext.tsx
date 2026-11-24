import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, type ConfigStatus } from '../lib/api';
import type { UserProfile, UserRole } from '../types/civic';

interface AuthContextValue {
  user: UserProfile | null;
  configStatus: ConfigStatus | null;
  unreadNotifications: number;
  loading: boolean;
  isDemoSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    locality: string;
  }) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    if (!api.getToken()) {
      setUnreadNotifications(0);
      return;
    }
    try {
      const data = await api.getNotifications();
      setUnreadNotifications(data.unreadCount);
    } catch {
      // Non-critical background count check
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const { user: fresh } = await api.getMe();
      setUser(fresh);
      await refreshNotifications();
    } catch {
      api.setToken(null);
      setUser(null);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await api.getConfigStatus();
        if (active) setConfigStatus(cfg);
      } catch {
        // Ignore initial config probe failure
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      api.setToken(res.token);
      setUser(res.user);
      setIsDemoSession(res.user.email.endsWith('.local'));
      await refreshNotifications();
    },
    [refreshNotifications]
  );

  const register = useCallback(
    async (payload: { full_name: string; email: string; password: string; locality: string }) => {
      const res = await api.register(payload);
      api.setToken(res.token);
      setUser(res.user);
      setIsDemoSession(false);
      await refreshNotifications();
    },
    [refreshNotifications]
  );

  const loginDemo = useCallback(
    async (role: UserRole) => {
      const res = await api.demoLogin(role);
      api.setToken(res.token);
      setUser(res.user);
      setIsDemoSession(true);
      await refreshNotifications();
    },
    [refreshNotifications]
  );

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setUnreadNotifications(0);
    setIsDemoSession(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        configStatus,
        unreadNotifications,
        loading,
        isDemoSession,
        login,
        register,
        loginDemo,
        logout,
        refreshUser,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
