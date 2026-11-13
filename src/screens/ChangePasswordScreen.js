import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

export default function ChangePasswordScreen() {
  const { user, updatePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.iconBox}>
            <Ionicons name="lock-closed-outline" size={30} color={colors.background} />
          </View>

          <Text style={styles.title}>Crie sua senha.</Text>
          <Text style={styles.subtitle}>
            {user?.firstName}, sua conta foi criada com uma senha provisória. Defina uma nova senha para continuar.
          </Text>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>SENHA PROVISÓRIA</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.disabled}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NOVA SENHA</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor={colors.disabled}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CONFIRMAR NOVA SENHA</Text>
              <TextInput
                style={styles.input}
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.disabled}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Salvar e continuar</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.logoutLink} onPress={logout}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  content: { alignSelf: 'center', alignItems: 'center', maxWidth: 420, width: '100%' },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 64,
    justifyContent: 'center',
    marginBottom: 22,
    width: 64,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: colors.disabled, fontSize: 14, lineHeight: 20, marginBottom: 28, marginTop: 8, textAlign: 'center' },
  errorText: { color: '#9A6B4F', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  form: { width: '100%' },
  field: { marginBottom: 16 },
  label: { color: '#6C6861', fontSize: 12, letterSpacing: 0.4, marginBottom: 7 },
  input: {
    backgroundColor: '#FCFAF8',
    borderColor: '#D8D2C9',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    height: 54,
    paddingHorizontal: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
  },
  buttonText: { color: colors.background, fontSize: 14, fontWeight: '600' },
  logoutLink: { marginTop: 22, paddingVertical: 10 },
  logoutText: { color: colors.disabled, fontSize: 13, textDecorationLine: 'underline' },
});