import { colors } from '@marstv/config';
import type { VideoItem } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

const MOCK_HISTORY: Array<{
  item: VideoItem;
  sourceName: string;
  watchedAt: string;
  progress: string;
}> = [];

export default function HistoryScreen() {
  const [items, setItems] = useState(MOCK_HISTORY);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      // In production, re-fetch from storage API
      setItems([...MOCK_HISTORY]);
      setRefreshing(false);
    }, 800);
  };

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
        keyExtractor={(h) => `${h.sourceName}:${h.item.id}`}
        renderItem={({ item: h }) => (
          <VideoCard
            item={h.item}
            sourceName={h.sourceName}
            onPress={() =>
              router.push({
                pathname: '/player',
                params: { source: h.item.source, id: h.item.id, title: h.item.title },
              })
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
