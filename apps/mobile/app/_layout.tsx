import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@marstv/config';

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
      />
    </>
  );
}
