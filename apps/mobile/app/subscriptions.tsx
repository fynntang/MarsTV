import { colors } from '@marstv/config';
import type { SubscriptionRecord } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { fetchSubscriptions } from '@marstv/ui-shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

export default function SubscriptionsScreen() {
  const [items, setItems] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await fetchSubscriptions();
      setItems(data as unknown as SubscriptionRecord[]);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <Container style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </Container>
    );
  }

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
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
