import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

const pointOrder = ['entry', 'break', 'return', 'exit'];

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

export { pointOrder };