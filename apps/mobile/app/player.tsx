import { colors } from '@marstv/config';
import type { PlayLine } from '@marstv/core';
import { Container, Spacer, TextView } from '@marstv/ui-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function PlayerScreen() {
  const { source, id, title } = useLocalSearchParams<{
    source: string;
    id: string;
    title: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [lines, _setLines] = useState<PlayLine[]>([]);
  const [error, _setError] = useState<string | null>(null);

  useEffect(() => {
    // In production, fetch play lines from CMS API then load into player.
    // For now, simulate a loading delay.
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Container style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: title ?? 'Player' }} />
      <View style={styles.playerArea}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : error ? (
          <View style={styles.center}>
            <TextView variant="body" color={colors.textMuted}>
              {error}
            </TextView>
          </View>
        ) : (
          <View style={styles.center}>
            <TextView variant="heading">{'▶'}</TextView>
            <Spacer size={12} />
            <TextView variant="caption" color={colors.textMuted}>
              Video player — connect to CMS source
            </TextView>
          </View>
        )}
      </View>
      <View style={styles.infoBar}>
        <TextView variant="body">{title ?? 'Unknown'}</TextView>
        <TextView variant="caption" color={colors.textMuted}>
          {source ?? ''} · {id ?? ''}
        </TextView>
        {lines.length > 0 && (
          <TextView variant="caption" color={colors.primary}>
            {lines.length} line(s) available
          </TextView>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  playerArea: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBar: {
    padding: 16,
    backgroundColor: colors.surface,
  },
});
