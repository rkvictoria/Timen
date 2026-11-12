import { getDb } from '../database/db';
import { authService } from './authService';

export const ENTRY_EXIT_PAIRS = 1;

function buildPointOrder(pairs = ENTRY_EXIT_PAIRS) {
  const order = [];
  for (let i = 1; i <= pairs; i += 1) {
    order.push(`entry_${i}`, `exit_${i}`);
  }
  return order;
}

function buildPointLabels(pairs = ENTRY_EXIT_PAIRS) {
  const labels = {};
  for (let i = 1; i <= pairs; i += 1) {
    labels[`entry_${i}`] = pairs > 1 ? `Entrada ${i}` : 'Entrada';
    labels[`exit_${i}`] = pairs > 1 ? `Saída ${i}` : 'Saída';
  }
  return labels;
}

const pointOrder = buildPointOrder();
const pointLabels = buildPointLabels();

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toPoint(row) {
  return { at: row.recorded_at, qrId: row.location_id, locationName: row.location_name };
}

export function pointTime(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.at || null;
}

export function pointLocation(value) {
  return value && typeof value === 'object' ? value.locationName || null : null;
}

export async function getTodayPoints(userId) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    'SELECT type, recorded_at, location_id, location_name FROM attendance WHERE user_id = ? AND date = ?',
    [userId, todayKey()],
  );
  return Object.fromEntries(rows.map((row) => [row.type, toPoint(row)]));
}

export async function getAllPoints(userId) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT date, type, recorded_at, location_id, location_name
     FROM attendance WHERE user_id = ? ORDER BY date DESC`,
    [userId],
  );

  const byDate = new Map();
  rows.forEach((row) => {
    if (!byDate.has(row.date)) byDate.set(row.date, {});
    byDate.get(row.date)[row.type] = toPoint(row);
  });
  return Array.from(byDate, ([date, points]) => ({ date, points }));
}

export async function getAllRecords() {
  const admin = await authService.requireManager();
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT a.user_id, a.date, a.type, a.recorded_at, a.location_id, a.location_name
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE u.organization_id = ?`,
    [admin.organizationId],
  );

  const records = {};
  rows.forEach((row) => {
    records[row.user_id] ??= {};
    records[row.user_id][row.date] ??= {};
    records[row.user_id][row.date][row.type] = toPoint(row);
  });
  return records;
}

export async function savePoint(type, userId, meta = {}) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO attendance (user_id, date, type, recorded_at, location_id, location_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, todayKey(), type, new Date().toISOString(), meta.qrId || null, meta.locationName || null],
  );
  return getTodayPoints(userId);
}

export function getNextPointType(points) {
  return pointOrder.find((type) => !points[type]) || null;
}

export function recordedDates(records) {
  const dates = new Set();
  Object.values(records).forEach((days) => {
    Object.entries(days).forEach(([date, points]) => {
      if (Object.keys(points).length > 0) dates.add(date);
    });
  });
  return dates;
}

export function attendanceEntries(records, users, date) {
  const names = new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()]));
  return Object.entries(records)
    .filter(([, days]) => days[date] && Object.keys(days[date]).length > 0)
    .map(([userId, days]) => ({
      userId,
      name: names.get(userId) || 'Usuário removido',
      points: days[date],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function workedMsForPoints(points, isToday = false) {
  let total = 0;
  for (let i = 1; i <= ENTRY_EXIT_PAIRS; i += 1) {
    const entry = pointTime(points[`entry_${i}`]);
    const exit = pointTime(points[`exit_${i}`]);
    if (!entry) break;
    const end = exit ? new Date(exit).getTime() : isToday ? Date.now() : null;
    if (end === null) continue;
    total += Math.max(0, end - new Date(entry).getTime());
  }
  return total;
}

export { todayKey, pointOrder, pointLabels };