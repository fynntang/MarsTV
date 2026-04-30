import { colors } from '@marstv/config';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" options={{ title: 'Sign In', headerBackVisible: false }} />
        <Stack.Screen name="index" options={{ title: 'MarsTV' }} />
        <Stack.Screen name="favorites" options={{ title: 'Favorites' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
        <Stack.Screen name="subscriptions" options={{ title: 'Subscriptions' }} />
        <Stack.Screen name="player" options={{ title: 'Player' }} />
      </Stack>
    </>
  );
}
