import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'cadastro'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [cadastroEmail, setCadastroEmail] = useState('');
  const [cadastroSenha, setCadastroSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modeTransition = useRef(new Animated.Value(1)).current;

  const switchMode = () => {
    Animated.timing(modeTransition, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setErrorMessage('');
      setMode((currentMode) => (currentMode === 'login' ? 'cadastro' : 'login'));
      Animated.timing(modeTransition, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      if (mode === 'cadastro') {
        await register(cadastroEmail, cadastroSenha);
        setMode('login');
        setCadastroSenha('');
        setErrorMessage('Cadastro realizado. Faça login.');
      } else {
        await login(loginEmail, loginSenha);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.decorations} pointerEvents="none">
        <Image
          source={require('../../assets/decorations/top-line.png')}
          style={styles.decorationTop}
          resizeMode="stretch"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Image
              source={require('../../assets/logo/Timen-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Animated.View
              style={[
                styles.modeContent,
                {
                  opacity: modeTransition,
                  transform: [
                    {
                      translateY: modeTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.headingBlock}>
                <Text style={styles.title}>
                  {mode === 'login' ? 'Bem-vindo de volta.' : 'Criar conta.'}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === 'login'
                    ? 'Entre para continuar'
                    : 'Preencha seus dados para começar'}
                </Text>
              </View>

              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

              <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>E-MAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.disabled}
                  value={mode === 'login' ? loginEmail : cadastroEmail}
                  onChangeText={mode === 'login' ? setLoginEmail : setCadastroEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SENHA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.disabled}
                  value={mode === 'login' ? loginSenha : cadastroSenha}
                  onChangeText={mode === 'login' ? setLoginSenha : setCadastroSenha}
                  secureTextEntry
                />
              </View>

              <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'login' ? 'Entrar' : 'Cadastrar'}
                  </Text>
                )}
              </Pressable>
              </View>
            </Animated.View>

            <Pressable
              style={styles.switchModeButton}
              onPress={switchMode}
            >
              <Text style={styles.switchModeText}>
                <Text style={styles.mutedText}>
                  {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
                </Text>
                <Text style={styles.linkText}>
                  {mode === 'login' ? 'Cadastrar' : 'Entrar'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View pointerEvents="none" style={styles.bottomLayer}>
        <Image
          source={require('../../assets/decorations/bottom-line.png')}
          style={styles.decorationBottom}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  decorations: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  decorationTop: {
    position: 'absolute',
    top: 0,
    left: '-26%',
    width: '152%',
    height: 230,
    opacity: 1,
    tintColor: colors.primary,
  },
  decorationBottom: {
    position: 'absolute',
    bottom: -60,
    left: '-10%',
    width: '120%',
    height: 220,
    opacity: 1,
    tintColor: colors.primary,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    alignSelf: 'center',
    height: 150,
    marginBottom: 24,
    marginTop: 34,
    width: 220,
  },
  modeContent: {
    width: '100%',
  },
  headingBlock: {
    alignItems: 'center',
    marginBottom: 38,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 38,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.disabled,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#9A6B4F',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: '#6C6861',
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 7,
  },
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
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 54,
    paddingVertical: 10,
  },
  switchModeText: {
    fontSize: 13,
  },
  mutedText: {
    color: colors.disabled,
  },
  linkText: {
    color: colors.text,
    textDecorationLine: 'underline',
  },
});