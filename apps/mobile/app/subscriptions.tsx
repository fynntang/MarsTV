import { colors } from '@marstv/config';
import type { SubscriptionRecord } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

const MOCK_SUBSCRIPTIONS: SubscriptionRecord[] = [];

export default function SubscriptionsScreen() {
  const [items] = useState(MOCK_SUBSCRIPTIONS);

  if (items.length === 0) {
    return (
      <Container style={styles.container}>
        <Spacer size={80} />
        <TextView variant="heading" style={styles.emptyTitle}>
          No Subscriptions
        </TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted} style={styles.emptyDesc}>
          Subscribe to shows to track new episodes
        </TextView>
      </Container>
    );
  }

  return (
    <Container style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(s) => `${s.source}:${s.id}`}
        renderItem={({ item: s }) => (
          <VideoCard
            item={{
              source: s.source,
              id: s.id,
              title: s.title,
              poster: s.poster,
            }}
            sourceName={s.sourceName ?? s.source}
            onPress={() =>
              router.push({
                pathname: '/player',
                params: { source: s.source, id: s.id, title: s.title },
              })
            }
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
  },
});
