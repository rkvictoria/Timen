import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { getAllPoints, pointOrder, todayKey } from '../services/pointService';

const pointLabels = { entry: 'Entrada', break: 'Início do intervalo', return: 'Retorno', exit: 'Saída' };

function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function workedMs(points, isToday) {
  if (!points.entry) return 0;
  const end = points.exit ? new Date(points.exit).getTime() : isToday ? Date.now() : null;
  if (end === null) return 0;
  const pause = points.break && points.return
    ? new Date(points.return).getTime() - new Date(points.break).getTime()
    : 0;
  return Math.max(0, end - new Date(points.entry).getTime() - pause);
}

function formatDuration(ms) {
  const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  return `${hours}h ${minutes}m`;
}

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
}

export default function HistoryView() {
  const [days, setDays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAllPoints()
      .then((data) => active && setDays(data))
      .catch(() => active && setDays([]))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const today = todayKey();
  const totalMs = useMemo(
    () => days.reduce((sum, { date, points }) => sum + workedMs(points, date === today), 0),
    [days, today],
  );

  return (
    <View style={styles.root}>
      <View style={styles.darkHeader}>
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

      <View style={styles.sheet}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : days.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={48} color={colors.disabled} />
            <Text style={styles.emptyTitle}>Nada por aqui ainda.</Text>
            <Text style={styles.emptyText}>Seus pontos registrados aparecerão neste histórico.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryEyebrow}>DIAS REGISTRADOS</Text>
                <Text style={styles.summaryValue}>{days.length}</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryEyebrow}>TOTAL TRABALHADO</Text>
                <Text style={styles.summaryValue}>{formatDuration(totalMs)}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {days.map(({ date, points }) => {
                const isToday = date === today;
                const count = pointOrder.filter((type) => points[type]).length;
                const complete = count === pointOrder.length;
                const dayMs = workedMs(points, isToday);
                return (
                  <View key={date} style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <View style={styles.dayHeaderLeft}>
                        <Text style={styles.dayEyebrow}>{isToday ? 'HOJE' : complete ? 'COMPLETO' : 'INCOMPLETO'}</Text>
                        <Text style={styles.dayTitle}>
                          {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(parseDateKey(date))}
                        </Text>
                      </View>
                      <View style={styles.dayHours}>
                        <Text style={styles.dayHoursValue}>{dayMs > 0 ? formatDuration(dayMs) : '—'}</Text>
                        <Text style={styles.dayHoursLabel}>{count}/4 pontos</Text>
                      </View>
                    </View>
                    {pointOrder.map((type, index) => {
                      const time = formatTime(points[type]);
                      const pending = time === '—';
                      return (
                        <View key={type} style={[styles.row, index < pointOrder.length - 1 && styles.rowBorder]}>
                          <View style={[styles.dot, pending && styles.dotPending]} />
                          <Text style={styles.rowLabel}>{pointLabels[type]}</Text>
                          <Text style={[styles.rowTime, pending && styles.rowTimePending]}>{time}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  darkHeader: { height: 110, paddingHorizontal: 24, paddingTop: 20 },
  headerTitle: { color: colors.background, fontSize: 30, fontWeight: '700' },
  headerSubtitle: { color: '#D8D2C9', fontSize: 13, marginTop: 4 },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  content: { padding: 22, paddingTop: 24, paddingBottom: 124 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 100, paddingHorizontal: 40 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 14 },
  emptyText: { color: colors.disabled, fontSize: 13, marginTop: 6, textAlign: 'center' },

  summaryCard: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 44,
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  summaryRight: { alignItems: 'flex-end' },
  summaryEyebrow: { color: '#AAA49B', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  summaryValue: { color: colors.background, fontSize: 22, fontWeight: '600' },

  dayCard: {
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayHeader: {
    alignItems: 'center',
    borderBottomColor: '#EAE5DE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingTop: 8,
  },
  dayHeaderLeft: { flex: 1, paddingRight: 12 },
  dayEyebrow: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  dayTitle: { color: colors.text, fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  dayHours: { alignItems: 'flex-end' },
  dayHoursValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  dayHoursLabel: { color: colors.disabled, fontSize: 11, marginTop: 2 },

  row: { alignItems: 'center', flexDirection: 'row', minHeight: 40 },
  rowBorder: { borderBottomColor: '#EAE5DE', borderBottomWidth: 1 },
  dot: { backgroundColor: '#5E7A68', borderRadius: 4, height: 7, marginRight: 10, width: 7 },
  dotPending: { backgroundColor: '#D8D2C9' },
  rowLabel: { color: colors.text, flex: 1, fontSize: 12 },
  rowTime: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowTimePending: { color: colors.disabled },
});