import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';
import ProfileView from '../components/ProfileView';
import { getNextPointType, getTodayPoints } from '../services/pointService';

const tabs = ['home', 'history', 'register', 'profile'];
const pointLabels = { entry: 'Entrada', break: 'Início do intervalo', return: 'Retorno', exit: 'Saída' };
const nextPointLabels = { entry: 'Registrar entrada', break: 'Iniciar intervalo', return: 'Registrar retorno', exit: 'Registrar saída' };

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [points, setPoints] = useState({});
  const [activeTab, setActiveTab] = useState('home');
  const tabPosition = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const dragStartPosition = useRef(0);
  const activeTabRef = useRef('home');
  const { width } = useWindowDimensions();
  const tabWidth = (width - 60) / 4;
  const firstName = useMemo(() => {
    if (user?.firstName) return user.firstName;

    return (user?.email || 'usuário')
      .split('@')[0]
      .split(/[._-]/)[0]
      .replace(/^./, (letter) => letter.toUpperCase());
  }, [user?.email, user?.firstName]);

  const refreshPoints = async () => {
    try {
      setPoints(await getTodayPoints());
    } catch {
      setPoints({});
    }
  };

  useEffect(() => {
    refreshPoints();
  }, []);

  useEffect(() => navigation.addListener('focus', () => {
    refreshPoints();
    if (activeTabRef.current !== 'register') return;

    activeTabRef.current = 'home';
    setActiveTab('home');
    contentOpacity.setValue(1);
    contentScale.setValue(1);
    Animated.spring(tabPosition, {
      toValue: 0,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }), [contentOpacity, contentScale, navigation, tabPosition]);
  const getIconAnimation = (index) => ({
    transform: [
      {
        scale: tabPosition.interpolate({
          inputRange: tabs.map((_, tabIndex) => tabIndex * tabWidth),
          outputRange: tabs.map((_, tabIndex) => (tabIndex === index ? 1.16 : 1)),
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  const animateContentTo = (nextTab) => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 0.94, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setActiveTab(nextTab);
      contentScale.setValue(0.9);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 230, useNativeDriver: true }),
        Animated.spring(contentScale, { toValue: 1, friction: 8, tension: 85, useNativeDriver: true }),
      ]).start();
    });
  };

  const nextPointType = getNextPointType(points);
  const goToPointValidation = () => {
    if (nextPointType) navigation.navigate('PointValidation', { pointType: nextPointType });
  };
  const pointRows = Object.keys(pointLabels).map((type) => ({
    type,
    label: pointLabels[type],
    time: points[type] ? new Date(points[type]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
  }));
  const recordedCount = Object.keys(points).length;
  const journeyFinished = !nextPointType;
  const journeyTitle = journeyFinished ? 'Finalizado' : 'Em andamento';
  const activeDuration = points.entry ? Math.max(0, (new Date(points.exit || Date.now()).getTime() - new Date(points.entry).getTime()) - (points.break && points.return ? new Date(points.return).getTime() - new Date(points.break).getTime() : 0)) : 0;
  const workedHours = `${String(Math.floor(activeDuration / 3600000)).padStart(2, '0')}h ${String(Math.floor((activeDuration % 3600000) / 60000)).padStart(2, '0')}m`;

  const selectTab = (index) => {
    const tab = tabs[index];

    if (tab === activeTabRef.current) return;

    if (tab === 'register') {
      if (!nextPointType) return;
      activeTabRef.current = tab;
      setActiveTab(tab);
      goToPointValidation();
    } else {
      animateContentTo(tab);
    }
    activeTabRef.current = tab;
    Animated.spring(tabPosition, {
      toValue: index * tabWidth,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
  };


  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
      onPanResponderGrant: () => {
        tabPosition.stopAnimation((value) => {
          dragStartPosition.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const maximumPosition = tabWidth * (tabs.length - 1);
        const nextPosition = Math.max(0, Math.min(dragStartPosition.current + gesture.dx, maximumPosition));
        tabPosition.setValue(nextPosition);
      },
      onPanResponderRelease: (_, gesture) => {
        const maximumPosition = tabWidth * (tabs.length - 1);
        const finalPosition = Math.max(0, Math.min(dragStartPosition.current + gesture.dx, maximumPosition));
        const index = Math.round(finalPosition / tabWidth);
        selectTab(index);
      },
      onPanResponderTerminate: () => {
        const index = tabs.indexOf(activeTabRef.current);
        selectTab(index);
      },
    }),
  ).current;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />
      <Animated.View style={[styles.tabContent, { opacity: contentOpacity, transform: [{ scale: contentScale }] }]}>
        {activeTab === 'profile' ? (
          <ProfileView />
        ) : (
          <>
            <View style={styles.darkHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
                onPress={logout}
                style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
              >
                <Text style={styles.logoutText}>Sair</Text>
              </Pressable>
            </View>
            <View style={styles.sheet}>
              <View style={styles.content}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{firstName}.</Text>
              <Text style={styles.date}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}</Text>
            </View>

            <View style={styles.journeyCard}>
              <View><Text style={styles.eyebrow}>JORNADA DE HOJE</Text><Text style={styles.journeyTitle}>{journeyTitle}</Text></View>
              <View style={styles.hoursBlock}><Text style={styles.hours}>{workedHours}</Text><Text style={styles.hoursLabel}>trabalhadas</Text></View>
            </View>

            {!journeyFinished && <Pressable style={({ pressed }) => [styles.registerButton, pressed && styles.pressed]} onPress={goToPointValidation}>
              <View><Text style={styles.registerText}>{nextPointLabels[nextPointType]}</Text><Text style={styles.registerHint}>Biometria · QR Code · Localização</Text></View>
              <Text style={styles.arrow}>→</Text>
            </Pressable>}

            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <View><Text style={styles.todayEyebrow}>REGISTROS DE HOJE</Text><Text style={styles.todayTitle}>Hoje</Text></View>
                <View style={styles.todayCount}><Text style={styles.todayCountValue}>{recordedCount}/4</Text><Text style={styles.todayCountLabel}>pontos</Text></View>
              </View>
              <View style={styles.todayTable}>
                {pointRows.map(({ type, label, time }, index) => <View key={type} style={[styles.todayRow, index < pointRows.length - 1 && styles.todayRowBorder]}>
                  <View style={[styles.todayDot, time === '—' && styles.todayDotPending]} />
                  <Text style={styles.todayLabel}>{label}</Text>
                  <Text style={[styles.todayTime, time === '—' && styles.todayTimePending]}>{time}</Text>
                  <Ionicons name={time === '—' ? 'remove' : 'checkmark'} size={16} color={time === '—' ? '#77736D' : '#A9C9B0'} />
                </View>)}
              </View>
            </View>
              </View>
            </View>
          </>
        )}
      </Animated.View>

      <View style={styles.bottomNav} {...panResponder.panHandlers}>
        <Animated.View style={[styles.tabIndicator, { left: 8 + (tabWidth - 50) / 2, transform: [{ translateX: tabPosition }] }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Início" style={styles.navItem} onPress={() => selectTab(0)}>
          <Animated.View style={getIconAnimation(0)}><Ionicons name="home" size={22} color={activeTab === 'home' ? colors.background : '#BDB8B0'} /></Animated.View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Histórico" style={styles.navItem} onPress={() => selectTab(1)}>
          <Animated.View style={getIconAnimation(1)}><Ionicons name="time-outline" size={23} color={activeTab === 'history' ? colors.background : '#BDB8B0'} /></Animated.View>
        </Pressable>
        <View style={styles.navItem}>
          <Pressable accessibilityRole="button" accessibilityLabel="Registrar ponto" style={[styles.mainNavItem, activeTab === 'register' && styles.mainNavItemActive]} onPress={() => selectTab(2, true)}>
            <Animated.View style={getIconAnimation(2)}><Ionicons name="scan-outline" size={25} color={colors.primary} /></Animated.View>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Perfil" style={styles.navItem} onPress={() => selectTab(3)}>
          <Animated.View style={getIconAnimation(3)}><Ionicons name="person-outline" size={23} color={activeTab === 'profile' ? colors.background : '#BDB8B0'} /></Animated.View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary }, darkHeader: { alignItems: 'flex-end', height: 94, paddingHorizontal: 22, paddingTop: 16 },
  logoutButton: { borderColor: '#6C6861', borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7 }, logoutButtonPressed: { opacity: .7 }, logoutText: { color: colors.background, fontSize: 12, fontWeight: '600' },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40 }, content: { padding: 22, paddingTop: 34, paddingBottom: 124 },
  bottomNav: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 25, bottom: 22, flexDirection: 'row', height: 64, justifyContent: 'space-around', left: 22, paddingHorizontal: 8, position: 'absolute', right: 22 },
  tabIndicator: { backgroundColor: '#383631', borderRadius: 14, elevation: 5, height: 50, position: 'absolute', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .22, shadowRadius: 5, width: 50 },
  navItem: { alignItems: 'center', flex: 1, height: 48, justifyContent: 'center', zIndex: 1 },
  mainNavItem: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 14, height: 50, justifyContent: 'center', width: 50, zIndex: 1 }, mainNavItemActive: { transform: [{ scale: 1.04 }] },
  greetingBlock: { marginBottom: 26 }, greeting: { color: colors.text, fontSize: 28, lineHeight: 34 }, name: { color: colors.text, fontSize: 28, fontWeight: '600', lineHeight: 34 }, date: { color: colors.disabled, fontSize: 13, marginTop: 8, textTransform: 'capitalize' },
  journeyCard: { alignItems: 'center', backgroundColor: '#FCFAF8', borderColor: '#E2DDD5', borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, padding: 18 }, eyebrow: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: .8, marginBottom: 5 }, journeyTitle: { color: colors.text, fontSize: 17, fontWeight: '600' }, hoursBlock: { alignItems: 'flex-end' }, hours: { color: colors.text, fontSize: 18, fontWeight: '700' }, hoursLabel: { color: colors.disabled, fontSize: 11, marginTop: 2 },
  registerButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, paddingHorizontal: 20, paddingVertical: 18 }, pressed: { opacity: .84 }, registerText: { color: colors.background, fontSize: 17, fontWeight: '700' }, registerHint: { color: '#D8D2C9', fontSize: 11, marginTop: 4 }, arrow: { color: colors.background, fontSize: 29 },
  registerButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, paddingHorizontal: 20, paddingVertical: 18 }, pressed: { opacity: .84 }, registerText: { color: colors.background, fontSize: 17, fontWeight: '700' }, registerHint: { color: '#D8D2C9', fontSize: 11, marginTop: 4 }, arrow: { color: colors.background, fontSize: 29 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' }, live: { alignItems: 'center', backgroundColor: '#E9E4DC', borderRadius: 10, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 5 }, liveDot: { backgroundColor: '#5E7A68', borderRadius: 4, height: 7, width: 7 }, liveText: { color: '#5E7A68', fontSize: 9, fontWeight: '700', letterSpacing: .7 },
  todayCard: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomLeftRadius: 72, borderBottomRightRadius: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginBottom: 16, marginRight: -4, marginTop: 4, overflow: 'hidden', padding: 15, width: '92%' }, todayHeader: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 0, width: '88%' }, todayEyebrow: { color: '#AAA49B', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 2 }, todayTitle: { color: colors.background, fontSize: 22, fontWeight: '600' }, todayCount: { alignItems: 'flex-end' }, todayCountValue: { color: colors.background, fontSize: 15, fontWeight: '700' }, todayCountLabel: { color: '#AAA49B', fontSize: 9, marginTop: 1 }, todayTable: { alignSelf: 'flex-end', backgroundColor: '#292824', borderRadius: 15, overflow: 'hidden', paddingHorizontal: 10, width: '88%' }, todayRow: { alignItems: 'center', flexDirection: 'row', minHeight: 42 }, todayRowBorder: { borderBottomColor: '#44413B', borderBottomWidth: 1 }, todayDot: { backgroundColor: '#A9C9B0', borderRadius: 4, height: 7, marginRight: 10, width: 7 }, todayDotPending: { backgroundColor: '#77736D' }, todayLabel: { color: '#E8E2D8', flex: 1, fontSize: 12 }, todayTime: { color: colors.background, fontSize: 13, fontWeight: '700', marginRight: 12 }, todayTimePending: { color: '#77736D' },
});
