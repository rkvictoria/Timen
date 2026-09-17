import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../styles/colors';

function Dot({ animation }) {
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: animation.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.3, 1, 0.3],
          }),
          transform: [
            {
              scale: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 1.15, 0.8],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export default function LoadingScreen() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (value, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <View style={styles.dotsWrapper}>
        <Dot animation={dot1} />
        <Dot animation={dot2} />
        <Dot animation={dot3} />
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
  dotsWrapper: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});