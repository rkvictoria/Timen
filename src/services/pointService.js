import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';


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

export async function getTodayPoints() {
  const storedPoints = await AsyncStorage.getItem(STORAGE_KEYS.POINTS);
  const pointsByDate = storedPoints ? JSON.parse(storedPoints) : {};
  return pointsByDate[todayKey()] || {};
}

export async function getAllPoints() {
  const storedPoints = await AsyncStorage.getItem(STORAGE_KEYS.POINTS);
  const pointsByDate = storedPoints ? JSON.parse(storedPoints) : {};
  return Object.keys(pointsByDate)
    .sort()
    .reverse()
    .map((date) => ({ date, points: pointsByDate[date] }));
}

export async function savePoint(type) {
  const storedPoints = await AsyncStorage.getItem(STORAGE_KEYS.POINTS);
  const pointsByDate = storedPoints ? JSON.parse(storedPoints) : {};
  const date = todayKey();
  const dayPoints = pointsByDate[date] || {};

  if (dayPoints[type]) return dayPoints;

  const nextPoints = { ...dayPoints, [type]: new Date().toISOString() };
  pointsByDate[date] = nextPoints;
  await AsyncStorage.setItem(STORAGE_KEYS.POINTS, JSON.stringify(pointsByDate));
  return nextPoints;
}

export function getNextPointType(points) {
  return pointOrder.find((type) => !points[type]) || null;
}

export function workedMsForPoints(points, isToday = false) {
  let total = 0;
  for (let i = 1; i <= ENTRY_EXIT_PAIRS; i += 1) {
    const entry = points[`entry_${i}`];
    const exit = points[`exit_${i}`];
    if (!entry) break;
    const end = exit ? new Date(exit).getTime() : isToday ? Date.now() : null;
    if (end === null) continue;
    total += Math.max(0, end - new Date(entry).getTime());
  }
  return total;
}

export { todayKey, pointOrder, pointLabels };