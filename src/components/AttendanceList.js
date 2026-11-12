import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';
import { pointLabels, pointLocation, pointOrder, todayKey, workedMsForPoints } from '../services/pointService';
import { formatDuration, formatTime } from '../utils/format';

export default function AttendanceList({ entries, date, emptyText }) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  const isToday = date === todayKey();

  return (
    <View>
      {entries.map(({ userId, name, points }) => {
        const dayMs = workedMsForPoints(points, isToday);
        return (
          <View key={userId} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <Text style={styles.hours}>{dayMs > 0 ? formatDuration(dayMs) : '—'}</Text>
            </View>
            {pointOrder.map((type, index) => {
              const time = formatTime(points[type]);
              const pending = time === '—';
              const location = pointLocation(points[type]);
              return (
                <View key={type} style={[styles.row, index < pointOrder.length - 1 && styles.rowBorder]}>
                  <View style={[styles.dot, pending && styles.dotPending]} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{pointLabels[type]}</Text>
                    {!!location && <Text style={styles.rowLocation} numberOfLines={1}>{location}</Text>}
                  </View>
                  <Text style={[styles.rowTime, pending && styles.rowTimePending]}>{time}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.disabled, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
  card: {
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#EAE5DE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 8,
  },
  name: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600', paddingRight: 12 },
  hours: { color: colors.text, fontSize: 14, fontWeight: '700' },
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  rowBorder: { borderBottomColor: '#EAE5DE', borderBottomWidth: 1 },
  dot: { backgroundColor: '#5E7A68', borderRadius: 4, height: 7, marginRight: 10, width: 7 },
  dotPending: { backgroundColor: '#D8D2C9' },
  rowText: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 12 },
  rowLocation: { color: colors.disabled, fontSize: 10, marginTop: 2 },
  rowTime: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowTimePending: { color: colors.disabled },
});