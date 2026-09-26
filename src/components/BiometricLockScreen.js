import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

export default function BiometricLockScreen() {
  const { user, unlock, logout } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const tryUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    setErrorMessage('');
    try {
      const result = await unlock();
      if (!result.success) {
        setErrorMessage('Não foi possível confirmar sua identidade.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [unlock]);

  useEffect(() => {
    tryUnlock();
  }, [tryUnlock]);

  const firstName = user?.firstName || (user?.email || 'usuário').split('@')[0];

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={40} color={colors.disabled} />
          )}
        </View>
        <Text style={styles.greeting}>Olá, {firstName}.</Text>
        <Text style={styles.hint}>Use a biometria para continuar</Text>

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <Pressable style={styles.button} onPress={tryUnlock} disabled={isAuthenticating}>
          {isAuthenticating ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Ionicons name="finger-print-outline" size={20} color={colors.background} />
              <Text style={styles.buttonText}>Desbloquear</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.logoutLink} onPress={logout}>
          <Text style={styles.logoutText}>Entrar com outra conta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 32, width: '100%' },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EAE5DE',
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    width: 84,
  },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { color: colors.text, fontSize: 22, fontWeight: '600' },
  hint: { color: colors.disabled, fontSize: 13, marginBottom: 24, marginTop: 6 },
  errorText: { color: '#9A6B4F', fontSize: 12, marginBottom: 16, textAlign: 'center' },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 32,
    width: '100%',
  },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: '700' },
  logoutLink: { marginTop: 22, paddingVertical: 10 },
  logoutText: { color: colors.disabled, fontSize: 13, textDecorationLine: 'underline' },
});