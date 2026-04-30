import { StyleSheet } from 'react-native';
import { TextView, Container } from '@marstv/ui-native';
import { colors } from '@marstv/config';

export default function PlayerScreen() {
  return (
    <Container style={styles.container}>
      <TextView variant="heading" color={colors.textMuted}>
        Player — Coming Soon
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
