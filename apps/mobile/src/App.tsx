import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { TextView, Container, Spacer } from '@marstv/ui-native';
import { colors } from '@marstv/config';

export default function App() {
  return (
    <Container style={styles.container}>
      <TextView variant="heading" color={colors.primary}>
        MarsTV
      </TextView>
      <Spacer size={8} />
      <TextView variant="caption" color={colors.textMuted}>
        Mobile / TV / Coming Soon
      </TextView>
      <StatusBar style="light" />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
