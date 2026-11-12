import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';
import { authService, ROLES } from '../services/authService';
import { attendanceEntries, getAllRecords, recordedDates, todayKey } from '../services/pointService';
import { getLocations } from '../services/locationService';
import { formatLongDate } from '../utils/format';
import AttendanceCalendar from './AttendanceCalendar';
import AttendanceList from './AttendanceList';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

const emptyData = { users: [], records: {}, locations: [] };

export default function ManagerDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(emptyData);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [users, records, locations] = await Promise.all([
        authService.listUsers(),
        getAllRecords(),
        getLocations(),
      ]);
      setData({ users, records, locations });
    } catch {
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);

  const today = todayKey();
  const entries = useMemo(() => attendanceEntries(data.records, data.users, today), [data, today]);
  const markedDates = useMemo(() => recordedDates(data.records), [data.records]);
  const members = useMemo(() => data.users.filter((item) => item.role === ROLES.MEMBER), [data.users]);
  const activeMembers = members.filter((item) => item.active).length;

  return (
    <View style={styles.root}>
      <View style={styles.darkHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          onPress={logout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.sheet}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{user?.firstName}.</Text>
              <Text style={styles.organization} numberOfLines={1}>{user?.organizationName}</Text>
              <Text style={styles.date}>{formatLongDate(new Date())}</Text>
            </View>

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.eyebrowLight}>REGISTROS DE HOJE</Text>
                <Text style={styles.summaryTitle}>Hoje</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryValue}>{entries.length}/{activeMembers}</Text>
                <Text style={styles.summaryLabel}>presentes</Text>
              </View>
            </View>

            <AttendanceList
              entries={entries}
              date={today}
              emptyText={activeMembers === 0 ? 'Cadastre seu primeiro colaborador.' : 'Nenhum registro hoje.'}
            />

            <Text style={styles.sectionTitle}>Calendário</Text>
            <AttendanceCalendar markedDates={markedDates} />

            <View style={styles.card}>
              <Text style={styles.eyebrow}>COLABORADORES</Text>
              <Text style={styles.cardText}>
                {members.length === 0
                  ? 'Nenhum colaborador cadastrado.'
                  : `${activeMembers} ${activeMembers === 1 ? 'ativo' : 'ativos'} de ${members.length}`}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Members')}
              >
                <Text style={styles.cardButtonText}>Gerenciar colaboradores</Text>
              </Pressable>
            </View>

            <View style={[styles.card, styles.cardSpaced]}>
              <Text style={styles.eyebrow}>QR CODES</Text>
              {data.locations.length === 0 ? (
                <Text style={styles.cardText}>Nenhum local cadastrado.</Text>
              ) : (
                <View style={styles.chips}>
                  {data.locations.map((location) => (
                    <Pressable
                      key={location.id}
                      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                      onPress={() => navigation.navigate('QrCodes', { qrId: location.id })}
                    >
                      <Text style={styles.chipText} numberOfLines={1}>{location.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable
                style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}
                onPress={() => navigation.navigate('QrCodes')}
              >
                <Text style={styles.cardButtonText}>Gerar novo QR Code</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  darkHeader: { alignItems: 'flex-end', height: 94, paddingHorizontal: 22, paddingTop: 16 },
  logoutButton: { borderColor: '#6C6861', borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7 },
  logoutText: { color: colors.background, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.84 },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { padding: 22, paddingTop: 34, paddingBottom: 124 },
  greetingBlock: { marginBottom: 26 },
  greeting: { color: colors.text, fontSize: 28, lineHeight: 34 },
  name: { color: colors.text, fontSize: 28, fontWeight: '600', lineHeight: 34 },
  organization: { color: '#B8893F', fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginTop: 8, textTransform: 'uppercase' },
  date: { color: colors.disabled, fontSize: 13, marginTop: 6, textTransform: 'capitalize' },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 18,
  },
  eyebrowLight: { color: '#AAA49B', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  summaryTitle: { color: colors.background, fontSize: 22, fontWeight: '600' },
  summaryRight: { alignItems: 'flex-end' },
  summaryValue: { color: colors.background, fontSize: 22, fontWeight: '700' },
  summaryLabel: { color: '#AAA49B', fontSize: 10, marginTop: 1 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 12, marginTop: 18 },
  card: {
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardSpaced: { marginTop: 14 },
  eyebrow: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  cardText: { color: colors.text, fontSize: 14, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { backgroundColor: '#EAE5DE', borderRadius: 14, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  cardButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, justifyContent: 'center', marginTop: 16, minHeight: 48 },
  cardButtonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
});