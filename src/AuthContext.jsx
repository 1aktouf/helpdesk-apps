import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, post } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await post('/auth/login', { email, password });
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, password) => {
    const u = await post('/auth/register', { email, password });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await post('/auth/logout', {}).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
