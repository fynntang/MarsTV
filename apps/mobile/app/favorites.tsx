import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@marstv/config';
import { Container, TextView, Spacer, VideoCard } from '@marstv/ui-native';
import type { VideoItem } from '@marstv/core';

const MOCK_FAVORITES: Array<{ item: VideoItem; sourceName: string }> = [];

export default function FavoritesScreen() {
  const [items] = useState(MOCK_FAVORITES);

  if (items.length === 0) {
    return (
      <Container style={styles.container}>
        <Spacer size={80} />
        <TextView variant="heading" style={styles.emptyTitle}>No Favorites</TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted} style={styles.emptyDesc}>
          Tap the heart icon on any video to save it here
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
