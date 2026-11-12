import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { todayKey } from '../services/pointService';

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AttendanceCalendar({ markedDates, selectedDate, onSelectDate }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = todayKey();

  const { cells, markedCount } = useMemo(() => {
    const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const items = Array.from({ length: firstWeekday }, () => null);
    let count = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toKey(cursor.year, cursor.month, day);
      const marked = markedDates.has(key);
      if (marked) count += 1;
      items.push({ day, key, marked });
    }
    return { cells: items, markedCount: count };
  }, [cursor, markedDates]);

  const shiftMonth = (delta) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const title = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(cursor.year, cursor.month, 1),
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} onPress={() => shiftMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" hitSlop={8} onPress={() => shiftMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {weekdays.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.cell}>
            <Text style={styles.weekday}>{label}</Text>
          </View>
        ))}
        {cells.map((cell, index) =>
          cell ? (
            <Pressable
              key={cell.key}
              disabled={!onSelectDate}
              onPress={() => onSelectDate(cell.key)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  cell.marked && styles.dayMarked,
                  cell.key === selectedDate && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    cell.marked && styles.dayTextMarked,
                    cell.key === today && styles.dayTextToday,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View key={`blank-${index}`} style={styles.cell} />
          ),
        )}
      </View>

      <Text style={styles.footer}>
        {markedCount} {markedCount === 1 ? 'dia com registro' : 'dias com registro'} no mês
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center', width: `${100 / 7}%`, paddingVertical: 3 },
  weekday: { color: colors.disabled, fontSize: 10, fontWeight: '700' },
  day: { alignItems: 'center', borderColor: 'transparent', borderRadius: 16, borderWidth: 2, height: 32, justifyContent: 'center', width: 32 },
  dayMarked: { backgroundColor: colors.primary },
  daySelected: { borderColor: '#D6A85F' },
  dayText: { color: colors.text, fontSize: 12 },
  dayTextMarked: { color: colors.background, fontWeight: '700' },
  dayTextToday: { fontWeight: '700', textDecorationLine: 'underline' },
  footer: { color: colors.disabled, fontSize: 11, marginTop: 10, textAlign: 'center' },
});