import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profileImageUrl?: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'smart-classroom-auth';

const loadStoredAuth = (): { user: User | null; token: string | null } => {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { user: null, token: null };

  try {
    const parsed = JSON.parse(stored) as { user: User; token: string | null };
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { user: null, token: null };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ user, token }, setAuthState] = useState<{ user: User | null; token: string | null }>(() =>
    loadStoredAuth()
  );

  useEffect(() => {
    // Persist auth state as long as a user is present, even if we don't yet use a real token.
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, token]);

  const login = (u: User, t: string) => {
    setAuthState({ user: u, token: t });
  };

  const logout = () => {
    setAuthState({ user: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
