import { colors, radius } from '@marstv/config';
import type { VideoItem } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const mockItems: { item: VideoItem; sourceName: string }[] = [
  {
    item: {
      source: 'demo',
      id: '1',
      title: '火星救援 The Martian',
      year: '2015',
      category: '科幻',
      poster: undefined,
    },
    sourceName: '演示源',
  },
  {
    item: {
      source: 'demo',
      id: '2',
      title: '星际穿越 Interstellar',
      year: '2014',
      category: '科幻',
      poster: undefined,
    },
    sourceName: '演示源',
  },
];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  return (
    <Container style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {mockItems.map(({ item, sourceName }) => (
          <View key={item.id} style={styles.cardWrapper}>
            <VideoCard
              item={item}
              sourceName={sourceName}
              onPress={() =>
                router.push({
                  pathname: '/player',
                  params: { source: item.source, id: item.id, title: item.title },
                })
              }
            />
          </View>
        ))}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.7}
          >
            <TextView variant="body" style={styles.navButtonText}>
              Favorites
            </TextView>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <TextView variant="body" style={styles.navButtonText}>
              History
            </TextView>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/subscriptions')}
            activeOpacity={0.7}
          >
            <TextView variant="body" style={styles.navButtonText}>
              Subscriptions
            </TextView>
          </TouchableOpacity>
        </View>
        <Spacer size={24} />
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cardWrapper: {
    marginBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  navButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
