import { createContext, useContext, useState, ReactNode } from 'react';
import { api } from '../lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  storageUsed?: number;
  storageLimit?: number;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('doczen_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('doczen_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  const persist = (t: string, u: User) => {
    localStorage.setItem('doczen_token', t);
    localStorage.setItem('doczen_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    persist(data.token, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
    persist(data.token, data.user);
  };

  const logout = () => {
    localStorage.removeItem('doczen_token');
    localStorage.removeItem('doczen_user');
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, token, login, register, logout }}>{children}</Ctx.Provider>;
}
