import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vinda(o), {user?.email}</Text>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 18, color: colors.text },
  button: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: colors.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
});