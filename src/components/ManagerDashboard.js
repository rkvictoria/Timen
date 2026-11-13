import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';
import { useAuth } from '../hooks/useAuth';
import { authService, ROLES } from '../services/authService';
import { getLocations } from '../services/locationService';
import { getNextPointType, getTodayPoints, pointOrder } from '../services/pointService';

const STATUS = {
  working: { label: 'Trabalhando', color: '#A9C9B0' },
  break: { label: 'Em pausa', color: '#D6A85F' },
  done: { label: 'Finalizou', color: '#C7C0B7' },
  absent: { label: 'Sem registro', color: '#77736D' },
};

const STATUS_ORDER = ['working', 'break', 'done', 'absent'];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

function statusOf(points) {
  const count = pointOrder.filter((type) => points[type]).length;
  const next = getNextPointType(points);

  if (!count) return 'absent';
  if (!next) return 'done';
  return next.startsWith('exit') ? 'working' : 'break';
}

export default function ManagerDashboard({ navigation }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [locationCount, setLocationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const firstName = useMemo(() => {
    if (user?.firstName) return user.firstName;

    return (user?.email || 'usuário')
      .split('@')[0]
      .split(/[._-]/)[0]
      .replace(/^./, (letter) => letter.toUpperCase());
  }, [user?.email, user?.firstName]);

  const load = useCallback(async () => {
    try {
      const [users, locations] = await Promise.all([authService.listUsers(), getLocations()]);
      const members = users.filter((item) => item.role === ROLES.MEMBER && item.active !== false);

      const result = await Promise.all(
        members.map(async (member) => {
          try {
            return statusOf(await getTodayPoints(member.id));
          } catch {
            return 'absent';
          }
        }),
      );

      setStatuses(result);
      setLocationCount(locations.length);
    } catch {
      setStatuses([]);
      setLocationCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);

  const counts = STATUS_ORDER.reduce(
    (acc, key) => ({ ...acc, [key]: statuses.filter((status) => status === key).length }),
    {},
  );
  const total = statuses.length;
  const present = total - counts.absent;
  const dayTitle = total === 0 ? 'Sem equipe' : present === 0 ? 'Sem registros' : 'Em andamento';

  return (
    <>
      <View style={styles.darkHeader}>
        <Text style={styles.brand}>Timen.</Text>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{firstName}.</Text>
            <Text style={styles.date}>
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <>
              <View style={styles.journeyCard}>
                <View>
                  <Text style={styles.eyebrow}>EQUIPE DE HOJE</Text>
                  <Text style={styles.journeyTitle}>{dayTitle}</Text>
                </View>
                <View style={styles.hoursBlock}>
                  <Text style={styles.hours}>
                    {present}/{total}
                  </Text>
                  <Text style={styles.hoursLabel}>presentes</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
                onPress={() => navigation.navigate('QrCodes')}
              >
                <View>
                  <Text style={styles.barText}>QR Codes</Text>
                  <Text style={styles.barHint}>
                    {locationCount === 0
                      ? 'Cadastre um local'
                      : `${locationCount} ${locationCount === 1 ? 'local' : 'locais'}`}
                  </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Members')}
              >
                <View>
                  <Text style={styles.barText}>Colaboradores</Text>
                  <Text style={styles.barHint}>Cadastrar e gerenciar</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </Pressable>

              <View style={styles.spacer} />

              <View style={styles.todayCard}>
                <View style={styles.todayHeader}>
                  <View>
                    <Text style={styles.todayEyebrow}>SITUAÇÃO AGORA</Text>
                    <Text style={styles.todayTitle}>Hoje</Text>
                  </View>
                  <View style={styles.todayCount}>
                    <Text style={styles.todayCountValue}>{total}</Text>
                    <Text style={styles.todayCountLabel}>ativos</Text>
                  </View>
                </View>

                <View style={styles.todayTable}>
                  {STATUS_ORDER.map((key, index) => (
                    <View
                      key={key}
                      style={[styles.todayRow, index < STATUS_ORDER.length - 1 && styles.todayRowBorder]}
                    >
                      <View style={[styles.todayDot, { backgroundColor: STATUS[key].color }]} />
                      <Text style={styles.todayLabel} numberOfLines={1}>
                        {STATUS[key].label}
                      </Text>
                      <Text style={styles.todayValue}>{counts[key]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  darkHeader: { alignItems: 'center', height: 94, paddingTop: 12 },
  brand: { color: colors.background, fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  content: { flexGrow: 1, padding: 22, paddingTop: 34, paddingBottom: 0 },
  loader: { marginTop: 32 },
  pressed: { opacity: 0.84 },

  greetingBlock: { marginBottom: 26 },
  greeting: { color: colors.text, fontSize: 28, lineHeight: 34 },
  name: { color: colors.text, fontSize: 28, fontWeight: '600', lineHeight: 34 },
  date: { color: colors.disabled, fontSize: 13, marginTop: 8, textTransform: 'capitalize' },

  journeyCard: {
    alignItems: 'center',
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 18,
  },
  eyebrow: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5 },
  journeyTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  hoursBlock: { alignItems: 'flex-end' },
  hours: { color: colors.text, fontSize: 18, fontWeight: '700' },
  hoursLabel: { color: colors.disabled, fontSize: 11, marginTop: 2 },

  bar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  barText: { color: colors.background, fontSize: 17, fontWeight: '700' },
  barHint: { color: '#D8D2C9', fontSize: 11, marginTop: 4 },
  arrow: { color: colors.background, fontSize: 29 },

  spacer: { flexGrow: 1, minHeight: 28 },
  todayCard: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 40,
    marginRight: -22,
    paddingBottom: 124,
    paddingLeft: 30,
    paddingRight: 18,
    paddingTop: 24,
    width: '70%',
  },
  todayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  todayEyebrow: { color: '#AAA49B', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  todayTitle: { color: colors.background, fontSize: 22, fontWeight: '600' },
  todayCount: { alignItems: 'flex-end' },
  todayCountValue: { color: colors.background, fontSize: 15, fontWeight: '700' },
  todayCountLabel: { color: '#AAA49B', fontSize: 9, marginTop: 1 },
  todayTable: { backgroundColor: '#292824', borderRadius: 15, overflow: 'hidden', paddingHorizontal: 10 },
  todayRow: { alignItems: 'center', flexDirection: 'row', minHeight: 42 },
  todayRowBorder: { borderBottomColor: '#44413B', borderBottomWidth: 1 },
  todayDot: { borderRadius: 4, height: 7, marginRight: 8, width: 7 },
  todayLabel: { color: '#E8E2D8', flex: 1, fontSize: 12 },
  todayValue: { color: colors.background, fontSize: 13, fontWeight: '700' },
});