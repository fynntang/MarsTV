import { StyleSheet } from 'react-native';
import { TextView, Container, Spacer } from '@marstv/ui-native';
import { colors } from '@marstv/config';

export default function HomeScreen() {
  return (
    <Container style={styles.container}>
      <TextView variant="heading" color={colors.primary}>
        MarsTV
      </TextView>
      <Spacer size={8} />
      <TextView variant="caption" color={colors.textMuted}>
        Home — Coming Soon
      </TextView>
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
