import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import BiometricLockScreen from '../components/BiometricLockScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import PointValidationScreen from '../screens/PointValidationScreen';
import QrCodesScreen from '../screens/QrCodesScreen';
import MembersScreen from '../screens/MembersScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isAuthenticated, isLoading, isLocked, isManager } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          animation: 'none',
          headerShown: false,
        }}
      >
        {isAuthenticated && isLocked ? (
          <Stack.Screen name="Lock" component={BiometricLockScreen} />
        ) : isAuthenticated && user.mustChangePassword ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            {isManager ? (
              <>
                <Stack.Screen name="QrCodes" component={QrCodesScreen} />
                <Stack.Screen name="Members" component={MembersScreen} />
              </>
            ) : (
              <Stack.Screen name="PointValidation" component={PointValidationScreen} />
            )}
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}