import { createContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TEMPORÁRIO: delay só para testar o LoadingScreen. Remover depois.
    const wait = new Promise((resolve) => setTimeout(resolve, 2000));

    Promise.all([authService.getSession(), wait])
      .then(([session]) => setUser(session))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const session = await authService.login(email, password);
    setUser(session);
  }, []);

  const register = useCallback(async (email, password) => {
    await authService.register(email, password);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}