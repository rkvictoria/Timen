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

  const register = useCallback(async (firstName, lastName, email, password, workplace) => {
    await authService.register(firstName, lastName, email, password, workplace);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (firstName, lastName) => {
    const session = await authService.updateProfile(firstName, lastName);
    setUser(session);
  }, []);

  const updateEmail = useCallback(async (email) => {
    const session = await authService.updateEmail(email);
    setUser(session);
  }, []);

  const updateWorkplace = useCallback(async (workplace) => {
    const session = await authService.updateWorkplace(workplace);
    setUser(session);
  }, []);

  const updateWorkplaceLocation = useCallback(async (latitude, longitude, allowedRadius) => {
    const session = await authService.updateWorkplaceLocation(latitude, longitude, allowedRadius);
    setUser(session);
  }, []);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    await authService.updatePassword(currentPassword, newPassword);
  }, []);

  const updatePhoto = useCallback(async (photoUri) => {
    const session = await authService.updatePhoto(photoUri);
    setUser(session);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        updateEmail,
        updateWorkplace,
        updateWorkplaceLocation,
        updatePassword,
        updatePhoto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}