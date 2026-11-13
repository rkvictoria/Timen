import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';
import { authService } from '../services/authService';
import {
  attendanceEntries,
  getAllPoints,
  getAllRecords,
  pointLabels,
  pointOrder,
  recordedDates,
  todayKey,
  workedMsForPoints,
} from '../services/pointService';
import { formatDuration, formatLongDate, formatTime, parseDateKey } from '../utils/format';
import AttendanceList from './AttendanceList';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildWeeks(year, month) {
  const offset = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];

  while (cells.length % 7) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

function isMarked(markedDates, key) {
  if (!markedDates) return false;
  if (markedDates instanceof Set) return markedDates.has(key);
  if (Array.isArray(markedDates)) return markedDates.includes(key);
  return !!markedDates[key];
}

export default function HistoryView({ onBack }) {
  const { isManager } = useAuth();
  const backArrowOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(backArrowOffset, { toValue: -3, duration: 650, useNativeDriver: true }),
        Animated.timing(backArrowOffset, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [backArrowOffset]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack}>
          <Animated.View style={{ transform: [{ translateX: backArrowOffset }] }}>
            <Ionicons name="chevron-back" size={27} color={colors.background} />
          </Animated.View>
        </Pressable>
        <Text style={styles.headerTitle}>Histórico</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isManager ? <ManagerHistory /> : <MemberHistory />}
    </View>
  );
}

function MemberHistory() {
  const { user } = useAuth();
  const [days, setDays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAllPoints(user.id)
      .then((data) => active && setDays(data))
      .catch(() => active && setDays([]))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [user.id]);

  const today = todayKey();
  const totalMs = useMemo(
    () => days.reduce((sum, { date, points }) => sum + workedMsForPoints(points, date === today), 0),
    [days, today],
  );

  return (
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
              const dayMs = workedMsForPoints(points, isToday);
              return (
                <View key={date} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Text style={styles.dayEyebrow}>{isToday ? 'HOJE' : complete ? 'COMPLETO' : 'INCOMPLETO'}</Text>
                      <Text style={styles.dayTitle}>{formatLongDate(parseDateKey(date))}</Text>
                    </View>
                    <View style={styles.dayHours}>
                      <Text style={styles.dayHoursValue}>{dayMs > 0 ? formatDuration(dayMs) : '—'}</Text>
                      <Text style={styles.dayHoursLabel}>{count}/{pointOrder.length} pontos</Text>
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
  );
}

function ManagerHistory() {
  const [data, setData] = useState({ users: [], records: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [month, setMonth] = useState(() => {
    const now = parseDateKey(todayKey());
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let active = true;
    Promise.all([authService.listUsers(), getAllRecords()])
      .then(([users, records]) => active && setData({ users, records }))
      .catch(() => active && setData({ users: [], records: {} }))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const markedDates = useMemo(() => recordedDates(data.records), [data.records]);
  const entries = useMemo(
    () => attendanceEntries(data.records, data.users, selectedDate),
    [data, selectedDate],
  );
  const weeks = useMemo(() => buildWeeks(month.getFullYear(), month.getMonth()), [month]);
  const today = todayKey();

  const shiftMonth = (step) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));

  return (
    <View style={styles.sheet}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.managerContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <Pressable hitSlop={12} onPress={() => shiftMonth(-1)}>
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </Pressable>

              <Text style={styles.calendarTitle}>
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </Text>

              <Pressable hitSlop={12} onPress={() => shiftMonth(1)}>
                <Ionicons name="chevron-forward" size={22} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.calendarRow}>
              {WEEKDAYS.map((label, index) => (
                <Text key={index} style={styles.calendarWeekday}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.calendarRow}>
                {week.map((day, dayIndex) => {
                  if (!day) return <View key={dayIndex} style={styles.calendarCell} />;

                  const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
                  const isSelected = key === selectedDate;

                  return (
                    <Pressable key={dayIndex} style={styles.calendarCell} onPress={() => setSelectedDate(key)}>
                      <View
                        style={[
                          styles.calendarDay,
                          key === today && styles.calendarDayToday,
                          isSelected && styles.calendarDaySelected,
                        ]}
                      >
                        <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day}</Text>
                        {isMarked(markedDates, key) && (
                          <View style={[styles.calendarMark, isSelected && styles.calendarMarkSelected]} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.managerBody}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle}>{formatLongDate(parseDateKey(selectedDate))}</Text>
              <Text style={styles.selectedCount}>
                {entries.length} {entries.length === 1 ? 'pessoa' : 'pessoas'}
              </Text>
            </View>

            <AttendanceList
              entries={entries}
              date={selectedDate}
              emptyText="Nenhum registro neste dia."
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerTitle: { color: colors.background, fontSize: 20, fontWeight: '600' },
  headerSpacer: { width: 27 },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  content: { padding: 22, paddingTop: 24, paddingBottom: 124 },
  managerContent: { paddingBottom: 124 },
  managerBody: { padding: 22, paddingTop: 24 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 100, paddingHorizontal: 40 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 14 },
  emptyText: { color: colors.disabled, fontSize: 13, marginTop: 6, textAlign: 'center' },

  calendar: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2DDD5',
    borderBottomWidth: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 16,
    paddingHorizontal: 6,
    paddingTop: 22,
  },
  calendarHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 18 },
  calendarTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  calendarRow: { flexDirection: 'row' },
  calendarWeekday: { color: colors.disabled, flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, textAlign: 'center' },
  calendarCell: { alignItems: 'center', flex: 1, height: 46, justifyContent: 'center' },
  calendarDay: { alignItems: 'center', borderColor: 'transparent', borderRadius: 13, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  calendarDayToday: { borderColor: '#D6A85F' },
  calendarDaySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  calendarDayText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  calendarDayTextSelected: { color: colors.background, fontWeight: '700' },
  calendarMark: { backgroundColor: '#5E7A68', borderRadius: 2, bottom: 4, height: 4, position: 'absolute', width: 4 },
  calendarMarkSelected: { backgroundColor: '#A9C9B0' },

  selectedHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  selectedTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600', paddingRight: 12, textTransform: 'capitalize' },
  selectedCount: { color: colors.disabled, fontSize: 12 },

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