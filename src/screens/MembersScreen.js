import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../styles/colors';
import { authService, ROLES } from '../services/authService';
import { getLocations } from '../services/locationService';

const emptyForm = { firstName: '', lastName: '', email: '', password: '', locationId: null };

export default function MembersScreen({ navigation }) {
  const [members, setMembers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [users, availableLocations] = await Promise.all([authService.listUsers(), getLocations()]);
      setMembers(users.filter((user) => user.role === ROLES.MEMBER));
      setLocations(availableLocations);
    } catch {
      setMembers([]);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);

  const setField = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const selectedLocationId = form.locationId || locations[0]?.id || null;

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await authService.createMember(
        form.firstName,
        form.lastName,
        form.email,
        form.password,
        selectedLocationId,
      );
      setForm(emptyForm);
      await load();
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggle = (member) => {
    const next = !member.active;
    Alert.alert(
      next ? 'Reativar colaborador' : 'Desativar colaborador',
      next
        ? `${member.firstName} voltará a acessar o app.`
        : `${member.firstName} não poderá mais entrar no app. Os registros são mantidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: next ? 'Reativar' : 'Desativar',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await authService.setMemberActive(member.id, next);
              await load();
            } catch (err) {
              Alert.alert('Erro', err.message);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={27} color={colors.background} />
        </Pressable>
        <Text style={styles.headerTitle}>Colaboradores</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>NOVO COLABORADOR</Text>

              {locations.length === 0 ? (
                <>
                  <Text style={styles.hint}>
                    Cadastre um local em QR Codes antes de adicionar colaboradores.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                    onPress={() => navigation.navigate('QrCodes')}
                  >
                    <Text style={styles.buttonText}>Ir para QR Codes</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.nameRow}>
                    <TextInput
                      style={[styles.input, styles.nameInput]}
                      value={form.firstName}
                      onChangeText={setField('firstName')}
                      placeholder="Nome"
                      placeholderTextColor={colors.disabled}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[styles.input, styles.nameInput]}
                      value={form.lastName}
                      onChangeText={setField('lastName')}
                      placeholder="Sobrenome"
                      placeholderTextColor={colors.disabled}
                      autoCapitalize="words"
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={setField('email')}
                    placeholder="E-mail"
                    placeholderTextColor={colors.disabled}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.password}
                    onChangeText={setField('password')}
                    placeholder="Senha provisória"
                    placeholderTextColor={colors.disabled}
                    secureTextEntry
                  />

                  <Text style={styles.fieldLabel}>LOCAL DE TRABALHO</Text>
                  <View style={styles.chips}>
                    {locations.map((location) => (
                      <Pressable
                        key={location.id}
                        style={[styles.chip, selectedLocationId === location.id && styles.chipActive]}
                        onPress={() => setField('locationId')(location.id)}
                      >
                        <Text
                          style={[styles.chipText, selectedLocationId === location.id && styles.chipTextActive]}
                          numberOfLines={1}
                        >
                          {location.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.button, isSaving && styles.buttonDisabled, pressed && styles.pressed]}
                    onPress={handleCreate}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={styles.buttonText}>Cadastrar colaborador</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Equipe</Text>
            {members.length === 0 ? (
              <Text style={styles.empty}>Nenhum colaborador cadastrado.</Text>
            ) : (
              members.map((member) => (
                <View key={member.id} style={[styles.memberCard, !member.active && styles.memberInactive]}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>{member.email}</Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {member.workplace}{member.active ? '' : ' · Desativado'}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.toggleButton, pressed && styles.pressed]}
                    onPress={() => confirmToggle(member)}
                  >
                    <Text style={styles.toggleText}>{member.active ? 'Desativar' : 'Reativar'}</Text>
                  </Pressable>
                </View>
              ))
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
  loader: { marginTop: 32 },
  card: {
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  hint: { color: colors.disabled, fontSize: 13, lineHeight: 19 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameInput: { flex: 1 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D2C9',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    height: 50,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  fieldLabel: { color: '#6C6861', fontSize: 11, letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#EAE5DE', borderRadius: 14, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, justifyContent: 'center', marginTop: 16, minHeight: 50 },
  buttonDisabled: { backgroundColor: '#A8A49C' },
  buttonText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.84 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 12, marginTop: 26 },
  empty: { color: colors.disabled, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  memberCard: {
    alignItems: 'center',
    backgroundColor: '#FCFAF8',
    borderColor: '#E2DDD5',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  memberInactive: { opacity: 0.55 },
  memberInfo: { flex: 1, paddingRight: 10 },
  memberName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  memberMeta: { color: colors.disabled, fontSize: 11, marginTop: 2 },
  toggleButton: { backgroundColor: '#EAE5DE', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  toggleText: { color: colors.text, fontSize: 12, fontWeight: '600' },
});