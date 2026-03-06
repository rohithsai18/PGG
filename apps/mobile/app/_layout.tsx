import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import AppHeader from '../src/components/AppHeader';

function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        header: ({ options, navigation, back }) => (
          <AppHeader title={(options.title as string) ?? ''} canGoBack={Boolean(back)} onBack={navigation.goBack} />
        )
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="unit/[id]" options={{ title: 'UNIT DETAILS' }} />
      <Stack.Screen name="booking-success" options={{ title: 'BOOKING SUCCESS' }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
