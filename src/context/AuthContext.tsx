import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api';
import type { NotificationItem, UserProfile } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastMessage[];
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  loginSuccess: (user: UserProfile, token: string, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const refreshNotifications = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const data = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>(
        '/api/notifications'
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore transient polling failure
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
      await refreshNotifications();
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  const loginSuccess = useCallback(
    (loggedInUser: UserProfile, token: string, rememberMe = true) => {
      setStoredToken(token, rememberMe);
      setUser(loggedInUser);
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markNotificationRead = useCallback(async (id: number) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        notifications,
        unreadCount,
        toasts,
        refreshUser,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        loginSuccess,
        logout,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
