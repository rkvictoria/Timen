import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getDb } from '../database/db';

export const ROLES = { MEMBER: 'member', MANAGER: 'manager' };

bcrypt.setRandomFallback((length) => {
  const bytes = Crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes);
});

const USER_QUERY = `
  SELECT u.*, o.name AS organization_name
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
`;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toSession(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    workplace:
      (row.role === ROLES.MANAGER ? row.organization_name : row.workplace) || 'Local de trabalho',
    workplaceLocation:
      row.workplace_latitude === null
        ? null
        : {
            latitude: row.workplace_latitude,
            longitude: row.workplace_longitude,
            allowedRadius: row.workplace_radius,
          },
    photo: row.photo || null,
    role: row.role,
    active: !!row.active,
  };
}

async function getSession() {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
  if (!stored) return null;

  const { userId } = JSON.parse(stored);
  const db = await getDb();
  const row = await db.getFirstAsync(`${USER_QUERY} WHERE u.id = ?`, [userId ?? '']);
  if (!row || !row.active) return null;

  return toSession(row);
}

async function requireManager() {
  const session = await getSession();
  if (session?.role !== ROLES.MANAGER) throw new Error('Acesso restrito.');
  return session;
}

async function updateCurrentUser(columns) {
  const session = await getSession();
  if (!session) throw new Error('Credenciais não encontradas.');

  const names = Object.keys(columns);
  const db = await getDb();
  await db.runAsync(
    `UPDATE users SET ${names.map((name) => `${name} = ?`).join(', ')} WHERE id = ?`,
    [...names.map((name) => columns[name]), session.id],
  );
  return getSession();
}

async function assertEmailAvailable(db, email, exceptUserId = '') {
  const existing = await db.getFirstAsync(
    'SELECT 1 AS found FROM users WHERE email = ? AND id != ?',
    [email, exceptUserId],
  );
  if (existing) throw new Error('Já existe um cadastro com esse e-mail.');
}

export const authService = {
  async register(firstName, lastName, email, password, organizationName) {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOrganization = organizationName.trim();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !normalizedOrganization) {
      throw new Error('Preencha nome, sobrenome, empresa, e-mail e senha.');
    }
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Insira um e-mail válido.');
    }
    if (password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const db = await getDb();
    await assertEmailAvailable(db, normalizedEmail);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const organizationId = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)', [
        organizationId,
        normalizedOrganization,
        now,
      ]);
      await db.runAsync(
        `INSERT INTO users (
          id, organization_id, first_name, last_name, email, password_hash, workplace, role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Crypto.randomUUID(),
          organizationId,
          normalizedFirstName,
          normalizedLastName,
          normalizedEmail,
          passwordHash,
          normalizedOrganization,
          ROLES.MANAGER,
          now,
        ],
      );
    });
  },

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error('Preencha e-mail e senha.');
    }

    const db = await getDb();
    const { total } = await db.getFirstAsync('SELECT COUNT(*) AS total FROM users');
    if (total === 0) {
      throw new Error('Nenhum usuário cadastrado neste dispositivo.');
    }

    const row = await db.getFirstAsync(`${USER_QUERY} WHERE u.email = ?`, [normalizedEmail]);
    const isMatch = !!row && (await bcrypt.compare(password, row.password_hash));

    if (!isMatch) {
      throw new Error('E-mail ou senha incorretos.');
    }
    if (!row.active) {
      throw new Error('Conta desativada. Fale com o administrador.');
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ userId: row.id }));
    return toSession(row);
  },

  async logout() {
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getSession,
  requireManager,

  async listUsers() {
    const admin = await requireManager();
    const db = await getDb();
    const rows = await db.getAllAsync(
      `${USER_QUERY} WHERE u.organization_id = ? ORDER BY u.first_name, u.last_name`,
      [admin.organizationId],
    );
    return rows.map(toSession);
  },

  async createMember(firstName, lastName, email, password, locationId) {
    const admin = await requireManager();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !locationId) {
      throw new Error('Preencha nome, sobrenome, e-mail, senha provisória e local.');
    }
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Insira um e-mail válido.');
    }
    if (password.length < 6) {
      throw new Error('A senha provisória deve ter no mínimo 6 caracteres.');
    }

    const db = await getDb();
    const location = await db.getFirstAsync(
      'SELECT name FROM locations WHERE id = ? AND organization_id = ?',
      [locationId, admin.organizationId],
    );
    if (!location) throw new Error('Local inválido.');

    await assertEmailAvailable(db, normalizedEmail);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.runAsync(
      `INSERT INTO users (
        id, organization_id, first_name, last_name, email, password_hash, workplace, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        admin.organizationId,
        normalizedFirstName,
        normalizedLastName,
        normalizedEmail,
        passwordHash,
        location.name,
        ROLES.MEMBER,
        new Date().toISOString(),
      ],
    );
  },

  async setMemberActive(userId, active) {
    const admin = await requireManager();
    const db = await getDb();
    const result = await db.runAsync(
      'UPDATE users SET active = ? WHERE id = ? AND organization_id = ? AND role = ?',
      [active ? 1 : 0, userId, admin.organizationId, ROLES.MEMBER],
    );
    if (result.changes === 0) throw new Error('Colaborador não encontrado.');
  },

  async updateProfile(firstName, lastName) {
    return updateCurrentUser({ first_name: firstName.trim(), last_name: lastName.trim() });
  },

  async updateEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) throw new Error('Insira um e-mail válido.');

    const session = await getSession();
    if (!session) throw new Error('Credenciais não encontradas.');

    const db = await getDb();
    await assertEmailAvailable(db, normalizedEmail, session.id);

    return updateCurrentUser({ email: normalizedEmail });
  },

  async updateWorkplace(workplace) {
    const session = await getSession();
    if (!session) throw new Error('Credenciais não encontradas.');
    if (session.role !== ROLES.MANAGER) {
      throw new Error('Somente o administrador pode alterar o local de trabalho.');
    }

    const normalizedWorkplace = workplace.trim();
    if (!normalizedWorkplace) throw new Error('Local de trabalho é obrigatório.');

    const db = await getDb();
    await db.runAsync('UPDATE organizations SET name = ? WHERE id = ?', [
      normalizedWorkplace,
      session.organizationId,
    ]);
    return getSession();
  },

  async updateWorkplaceLocation(latitude, longitude, allowedRadius) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error('Selecione um ponto válido no mapa.');
    }
    const normalizedRadius = Number(allowedRadius);
    if (!Number.isFinite(normalizedRadius) || normalizedRadius <= 0) {
      throw new Error('Informe um raio válido em metros.');
    }

    return updateCurrentUser({
      workplace_latitude: latitude,
      workplace_longitude: longitude,
      workplace_radius: normalizedRadius,
    });
  },

  async resetWorkplaceLocation() {
    return updateCurrentUser({
      workplace_latitude: null,
      workplace_longitude: null,
      workplace_radius: null,
    });
  },

  async updatePassword(currentPassword, newPassword) {
    const session = await getSession();
    if (!session) throw new Error('Credenciais não encontradas.');

    const db = await getDb();
    const row = await db.getFirstAsync('SELECT password_hash FROM users WHERE id = ?', [session.id]);

    const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
    if (!isMatch) throw new Error('Senha atual incorreta.');

    if (newPassword.length < 6) throw new Error('A nova senha deve ter no mínimo 6 caracteres.');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, session.id]);
  },

  async updatePhoto(photoUri) {
    return updateCurrentUser({ photo: photoUri });
  },
};