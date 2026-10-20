import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password, centerSlug) => {
    const { data } = await api.post('/auth/login', { email, password, centerSlug });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data.data;
  };

  const registerCenter = async (payload) => {
    const { data } = await api.post('/auth/register-center', payload);
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerCenter, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
