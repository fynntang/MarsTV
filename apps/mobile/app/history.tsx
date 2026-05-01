import { colors } from '@marstv/config';
import type { PlayRecord, VideoItem } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { fetchHistory as fetchHistoryApi } from '@marstv/ui-shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  const [items, setItems] = useState<PlayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const data = await fetchHistoryApi();
      setItems(data as PlayRecord[]);
      setError(false);
    } catch {
      if (items.length === 0) setError(true);
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

  if (error) {
    return (
      <Container style={styles.container}>
        <Spacer size={80} />
        <TextView variant="heading" style={styles.emptyTitle}>
          Failed to Load
        </TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted} style={styles.emptyDesc}>
          Pull down to retry
        </TextView>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container style={styles.container}>
        <Spacer size={80} />
        <TextView variant="heading" style={styles.emptyTitle}>
          No History
        </TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted} style={styles.emptyDesc}>
          Videos you watch will appear here so you can pick up where you left off
        </TextView>
      </Container>
    );
  }

  return (
    <Container style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(h) => `${h.source}:${h.id}`}
        renderItem={({ item: h }) => (
          <VideoCard
            item={{ source: h.source, id: h.id, title: h.title, poster: h.poster } as VideoItem}
            sourceName={h.sourceName ?? h.source}
            onPress={() =>
              router.push({
                pathname: '/player',
                params: { source: h.source, id: h.id, title: h.title },
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
