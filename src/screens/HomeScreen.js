import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

const fallbackRegion = { latitude: -15.793889, longitude: -47.882778, latitudeDelta: 0.012, longitudeDelta: 0.012 };
const records = [['Entrada', '08:00'], ['Início do intervalo', '12:03'], ['Fim do intervalo', '13:01']];
const tabs = ['home', 'history', 'register', 'profile'];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [region, setRegion] = useState(fallbackRegion);
  const [locationText, setLocationText] = useState('Buscando sua localização…');
  const [isLocating, setIsLocating] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const tabPosition = useRef(new Animated.Value(0)).current;
  const dragStartPosition = useRef(0);
  const activeTabRef = useRef('home');
  const iconShakeAnimations = useRef(tabs.map(() => new Animated.Value(0))).current;
  const { width } = useWindowDimensions();
  const tabWidth = (width - 60) / 4;
  const firstName = useMemo(() => {
    if (user?.firstName) return user.firstName;

    return (user?.email || 'usuário')
      .split('@')[0]
      .split(/[._-]/)[0]
      .replace(/^./, (letter) => letter.toUpperCase());
  }, [user?.email, user?.firstName]);

  useEffect(() => {
    async function getLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Permita a localização para validar o ponto.');
        setIsLocating(false);
        return;
      }
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        setRegion({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 });
        setLocationText('Localização atual confirmada');
      } catch {
        setLocationText('Não foi possível obter sua localização agora.');
      } finally {
        setIsLocating(false);
      }
    }
    getLocation();
  }, []);

  const animateSelectedIcon = (index) => {
    const shake = iconShakeAnimations[index];
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -2, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 2, duration: 80, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 65, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const getIconAnimation = (index) => ({
    transform: [
      { translateX: iconShakeAnimations[index] },
      {
        scale: tabPosition.interpolate({
          inputRange: tabs.map((_, tabIndex) => tabIndex * tabWidth),
          outputRange: tabs.map((_, tabIndex) => (tabIndex === index ? 1.16 : 1)),
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  const selectTab = (index, openRegister = false) => {
    const tab = tabs[index];
    activeTabRef.current = tab;
    setActiveTab(tab);
    Animated.spring(tabPosition, {
      toValue: index * tabWidth,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
    animateSelectedIcon(index);

    if (tab === 'register' && openRegister) {
      Alert.alert('Validação de ponto', 'A próxima tela confirmará biometria, lerá o QR Code e validará a localização.');
    }
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
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{firstName}.</Text>
          <Text style={styles.date}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}</Text>
        </View>

        <View style={styles.journeyCard}>
          <View><Text style={styles.eyebrow}>JORNADA DE HOJE</Text><Text style={styles.journeyTitle}>Em andamento</Text></View>
          <View style={styles.hoursBlock}><Text style={styles.hours}>04h 58m</Text><Text style={styles.hoursLabel}>trabalhadas</Text></View>
        </View>

        <Pressable style={({ pressed }) => [styles.registerButton, pressed && styles.pressed]} onPress={() => Alert.alert('Validação de ponto', 'A próxima tela confirmará biometria, lerá o QR Code e validará a localização.')}>
          <View><Text style={styles.registerText}>Registrar ponto</Text><Text style={styles.registerHint}>Biometria · QR Code · Localização</Text></View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Localização atual</Text><View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>AO VIVO</Text></View></View>
        <View style={styles.locationCard}>
          {Platform.OS === 'web' ? <View style={styles.webMap}><Text style={styles.webMapText}>Mapa disponível no aplicativo móvel</Text></View> : <MapView style={styles.map} region={region} scrollEnabled={false} rotateEnabled={false}><Marker coordinate={region} title="Você está aqui" /><Circle center={region} radius={60} fillColor="rgba(28,27,24,.12)" strokeColor="rgba(28,27,24,.35)" /></MapView>}
          <View style={styles.locationInfo}>{isLocating && <ActivityIndicator size="small" color={colors.primary} />}<Text style={styles.locationText}>{locationText}</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Histórico de hoje</Text><Text style={styles.count}>3 registros</Text></View>
        <View style={styles.historyCard}>{records.map(([label, time], index) => <View key={label} style={[styles.record, index < records.length - 1 && styles.recordBorder]}><View style={styles.recordIcon}><View style={styles.recordDot} /></View><Text style={styles.recordLabel}>{label}</Text><Text style={styles.time}>{time}</Text><Text style={styles.confirmed}>Confirmado</Text></View>)}</View>
      </ScrollView>

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
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' }, live: { alignItems: 'center', backgroundColor: '#E9E4DC', borderRadius: 10, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 5 }, liveDot: { backgroundColor: '#5E7A68', borderRadius: 4, height: 7, width: 7 }, liveText: { color: '#5E7A68', fontSize: 9, fontWeight: '700', letterSpacing: .7 },
  locationCard: { backgroundColor: '#FCFAF8', borderColor: '#E2DDD5', borderRadius: 18, borderWidth: 1, marginBottom: 32, overflow: 'hidden' }, map: { height: 156, width: '100%' }, webMap: { alignItems: 'center', backgroundColor: '#E9E4DC', height: 156, justifyContent: 'center' }, webMapText: { color: colors.disabled, fontSize: 12 }, locationInfo: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 48, paddingHorizontal: 14 }, locationText: { color: colors.text, flex: 1, fontSize: 12 },
  count: { color: colors.disabled, fontSize: 12 }, historyCard: { backgroundColor: '#FCFAF8', borderColor: '#E2DDD5', borderRadius: 18, borderWidth: 1, overflow: 'hidden' }, record: { alignItems: 'center', flexDirection: 'row', minHeight: 62, paddingHorizontal: 15 }, recordBorder: { borderBottomColor: '#EAE5DE', borderBottomWidth: 1 }, recordIcon: { alignItems: 'center', backgroundColor: '#E9E4DC', borderRadius: 12, height: 24, justifyContent: 'center', marginRight: 10, width: 24 }, recordDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 }, recordLabel: { color: colors.text, flex: 1, fontSize: 12 }, time: { color: colors.text, fontSize: 13, fontWeight: '700', marginRight: 12 }, confirmed: { color: '#5E7A68', fontSize: 10, fontWeight: '600' },
});
