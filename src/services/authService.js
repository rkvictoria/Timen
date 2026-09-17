import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '../constants/storageKeys';

bcrypt.setRandomFallback((length) => {
  const bytes = Crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes);
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const authService = {
  async register(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error('Preencha e-mail e senha.');
    }
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Insira um e-mail válido.');
    }
    if (password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const existing = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (existing) {
      const stored = JSON.parse(existing);
      if (stored.email === normalizedEmail) {
        throw new Error('Já existe um cadastro com esse e-mail.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await AsyncStorage.setItem(
      STORAGE_KEYS.CREDENTIALS,
      JSON.stringify({ email: normalizedEmail, passwordHash })
    );
  },

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error('Preencha e-mail e senha.');
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) {
      throw new Error('Nenhum usuário cadastrado neste dispositivo.');
    }

    const credentials = JSON.parse(stored);
    const isMatch =
      credentials.email === normalizedEmail &&
      (await bcrypt.compare(password, credentials.passwordHash));

    if (!isMatch) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const session = { email: credentials.email };
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    return session;
  },

  async logout() {
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  async getSession() {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },
};