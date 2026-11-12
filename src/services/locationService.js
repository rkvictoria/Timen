import * as Crypto from 'expo-crypto';
import { getDb } from '../database/db';
import { authService } from './authService';

function toLocation(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function getLocations() {
  const session = await authService.getSession();
  if (!session) throw new Error('Sessão expirada.');

  const db = await getDb();
  const rows = await db.getAllAsync(
    'SELECT * FROM locations WHERE organization_id = ? ORDER BY created_at',
    [session.organizationId],
  );
  return rows.map(toLocation);
}

export async function createLocation(name) {
  const admin = await authService.requireManager();

  const normalized = name.trim();
  if (!normalized) throw new Error('Informe o nome do local.');

  const db = await getDb();
  const existing = await db.getFirstAsync(
    'SELECT 1 AS found FROM locations WHERE organization_id = ? AND name = ?',
    [admin.organizationId, normalized],
  );
  if (existing) throw new Error('Já existe um local com esse nome.');

  const location = {
    id: Crypto.randomUUID(),
    organizationId: admin.organizationId,
    name: normalized,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO locations (id, organization_id, name, created_at) VALUES (?, ?, ?, ?)',
    [location.id, location.organizationId, location.name, location.createdAt],
  );
  return location;
}

export function buildQrPayload(location) {
  return JSON.stringify({
    app: 'Timen',
    type: 'workplace',
    orgId: location.organizationId,
    qrId: location.id,
    workplace: location.name,
  });
}