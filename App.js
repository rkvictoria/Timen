import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from './src/styles/colors';

export default function App() {
  const buttonAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(buttonAnimation, {
      toValue: 1,
      duration: 700,
      delay: 250,
      useNativeDriver: true,
    }).start();
  }, [buttonAnimation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Image
          source={require('./assets/logo/Timen-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              opacity: buttonAnimation,
              transform: [
                {
                  translateY: buttonAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Entrar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logo: {
    height: 380,
    width: 412,
  },
  buttonWrapper: {
    alignItems: 'center',
    bottom: -150,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    minHeight: 56,
    width: 300,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
