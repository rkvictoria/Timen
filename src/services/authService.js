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
  async register(firstName, lastName, email, password, workplace) {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedWorkplace = workplace.trim();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !normalizedWorkplace) {
      throw new Error('Preencha nome, sobrenome, local de trabalho, e-mail e senha.');
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
      JSON.stringify({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        workplace: normalizedWorkplace,
        workplaceLocation: null,
        passwordHash,
      })
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

    const session = {
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      email: credentials.email,
      workplace: credentials.workplace || 'Local de trabalho',
      workplaceLocation: credentials.workplaceLocation || null,
      photo: credentials.photo || null,
    };
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

  async updateProfile(firstName, lastName) {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);

    credentials.firstName = firstName.trim();
    credentials.lastName = lastName.trim();

    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));

    const session = await this.getSession();
    if (session) {
      session.firstName = credentials.firstName;
      session.lastName = credentials.lastName;
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    }
  },

  async updateEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) throw new Error('Insira um e-mail válido.');

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);

    credentials.email = normalizedEmail;

    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));

    const session = await this.getSession();
    if (session) {
      session.email = credentials.email;
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    }
  },

  async updateWorkplace(workplace) {
    const normalizedWorkplace = workplace.trim();
    if (!normalizedWorkplace) throw new Error('Local de trabalho é obrigatório.');

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);
    credentials.workplace = normalizedWorkplace;
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));

    const session = await this.getSession();
    if (session) {
      session.workplace = normalizedWorkplace;
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    }
  },

  async updateWorkplaceLocation(latitude, longitude, allowedRadius) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error('Selecione um ponto válido no mapa.');
    }
    const normalizedRadius = Number(allowedRadius);
    if (!Number.isFinite(normalizedRadius) || normalizedRadius <= 0) {
      throw new Error('Informe um raio válido em metros.');
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);
    credentials.workplaceLocation = { latitude, longitude, allowedRadius: normalizedRadius };
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));

    const session = await this.getSession();
    if (session) {
      session.workplaceLocation = credentials.workplaceLocation;
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    }
  },

  async resetWorkplaceLocation() {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);
    credentials.workplaceLocation = null;
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));

    const session = await this.getSession();
    if (session) {
      session.workplaceLocation = null;
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    }
  },

  async updatePassword(currentPassword, newPassword) {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);

    const isMatch = await bcrypt.compare(currentPassword, credentials.passwordHash);
    if (!isMatch) throw new Error('Senha atual incorreta.');

    if (newPassword.length < 6) throw new Error('A nova senha deve ter no mínimo 6 caracteres.');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    credentials.passwordHash = passwordHash;

    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
  },

  async updatePhoto(photoUri) {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!stored) throw new Error('Credenciais não encontradas.');
    const credentials = JSON.parse(stored);

    credentials.photo = photoUri;
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));

    const session = await this.getSession();
    if (session) {
      session.photo = photoUri;
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    }
  }
};