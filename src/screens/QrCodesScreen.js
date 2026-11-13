import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../styles/colors';
import { buildQrPayload, createLocation, getLocations } from '../services/locationService';

export default function QrCodesScreen({ navigation, route }) {
  const [locations, setLocations] = useState([]);
  const [selectedId, setSelectedId] = useState(route.params?.qrId || null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    getLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
      .finally(() => setIsLoading(false));
  }, []);

  const selected = locations.find((item) => item.id === selectedId) || locations[0] || null;

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const location = await createLocation(name);
      setLocations((current) => [...current, location]);
      setSelectedId(location.id);
      setName('');
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()}>
          <Animated.View style={{ transform: [{ translateX: backArrowOffset }] }}>
            <Ionicons name="chevron-back" size={27} color={colors.background} />
          </Animated.View>
        </Pressable>
        <Text style={styles.headerTitle}>QR Codes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>NOVO LOCAL</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome do local"
            placeholderTextColor={colors.disabled}
            autoCapitalize="words"
          />
          <Pressable
            style={({ pressed }) => [styles.button, (isSaving || !name.trim()) && styles.buttonDisabled, pressed && styles.pressed]}
            onPress={handleCreate}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>Gerar QR Code</Text>
            )}
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : locations.length === 0 ? (
          <Text style={styles.empty}>Cadastre um local para gerar o primeiro QR Code.</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Locais</Text>
            <View style={styles.chips}>
              {locations.map((location) => (
                <Pressable
                  key={location.id}
                  style={[styles.chip, selected?.id === location.id && styles.chipActive]}
                  onPress={() => setSelectedId(location.id)}
                >
                  <Text
                    style={[styles.chipText, selected?.id === location.id && styles.chipTextActive]}
                    numberOfLines={1}
                  >
                    {location.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {selected && (
              <View style={styles.qrCard}>
                <View style={styles.qrBox}>
                  <QRCode value={buildQrPayload(selected)} size={220} backgroundColor="#FFFFFF" color="#1C1B18" />
                </View>
                <Text style={styles.qrName}>{selected.name}</Text>
                <Text style={styles.qrHint}>
                  Criado em {new Date(selected.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, flex: 1 },
  content: { padding: 22, paddingTop: 30, paddingBottom: 60 },
  card: {
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D2C9',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    height: 50,
    paddingHorizontal: 16,
  },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, justifyContent: 'center', marginTop: 12, minHeight: 50 },
  buttonDisabled: { backgroundColor: '#A8A49C' },
  buttonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.84 },
  loader: { marginTop: 32 },
  empty: { color: colors.disabled, fontSize: 13, marginTop: 28, textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 12, marginTop: 26 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#EAE5DE', borderRadius: 14, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  qrCard: { alignItems: 'center', marginTop: 22 },
  qrBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  qrName: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16 },
  qrHint: { color: colors.disabled, fontSize: 11, marginTop: 4 },
});