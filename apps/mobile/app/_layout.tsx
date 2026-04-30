import { colors } from '@marstv/config';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { isAuthenticated } from '../src/lib/auth';

function useAuthGate() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) return;
    if (segments[0] !== 'login') {
      router.replace('/login');
    }
  }, [segments, router]);
}

export default function RootLayout() {
  useAuthGate();

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
        <Stack.Screen name="douban" options={{ title: 'Douban' }} />
        <Stack.Screen name="player" options={{ title: 'Player' }} />
      </Stack>
    </>
  );
}
