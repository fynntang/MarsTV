import { colors, radius } from '@marstv/config';
import type { PlayRecord, SubscriptionRecord, VideoItem } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { fetchDoubanRankings, fetchHistory, fetchSubscriptions } from '@marstv/ui-shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const [doubanItems, setDoubanItems] = useState<Array<Record<string, unknown>>>([]);
  const [continueItems, setContinueItems] = useState<PlayRecord[]>([]);
  const [subscriptionItems, setSubscriptionItems] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [douban, history, subscriptions] = await Promise.all([
        fetchDoubanRankings('movie', undefined, 10),
        fetchHistory(),
        fetchSubscriptions(),
      ]);
      setDoubanItems(douban);
      setContinueItems(history as unknown as PlayRecord[]);
      setSubscriptionItems(subscriptions as unknown as SubscriptionRecord[]);
    } catch {
      // Show empty state
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <Container style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </Container>
    );
  }

  return (
    <Container style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={styles.listContent}
      >
        {/* Continue Watching */}
        {continueItems.length > 0 && (
          <>
            <TextView variant="heading">Continue Watching</TextView>
            <FlatList
              horizontal
              data={continueItems.slice(0, 10)}
              keyExtractor={(item) => `${item.source}:${item.id}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ marginRight: 12, width: 140 }}
                  onPress={() => router.push({ pathname: '/player', params: { source: item.source, id: item.id } })}
                >
                  <VideoCard item={{ source: item.source, id: item.id, title: item.title, poster: item.poster } as VideoItem} sourceName={item.sourceName ?? item.source} />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
            <Spacer size={24} />
          </>
        )}

        {/* Douban Rankings */}
        {doubanItems.length > 0 && (
          <>
            <TextView variant="heading">Douban Rankings</TextView>
            <FlatList
              horizontal
              data={doubanItems.slice(0, 10)}
              keyExtractor={(_, i) => `douban-${i}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const d = item as Record<string, unknown>;
                return (
                  <TouchableOpacity style={{ marginRight: 12, width: 140 }}>
                    <VideoCard item={{
                      source: (d.source as string) ?? 'douban',
                      id: String(d.id ?? ''),
                      title: (d.title as string) ?? '',
                      poster: d.poster as string | undefined,
                      rating: typeof d.rating === 'number' ? d.rating : typeof d.score === 'number' ? d.score : (d.rating != null ? Number.parseFloat(String(d.rating)) : d.score != null ? Number.parseFloat(String(d.score)) : undefined),
                    } as VideoItem} sourceName={(d.source as string) ?? 'douban'} />
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
            <Spacer size={24} />
          </>
        )}

        {/* Subscriptions */}
        {subscriptionItems.length > 0 && (
          <>
            <TextView variant="heading">My Subscriptions</TextView>
            <FlatList
              horizontal
              data={subscriptionItems.slice(0, 10)}
              keyExtractor={(item) => `${item.source}:${item.id}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ marginRight: 12, width: 140 }}
                  onPress={() => router.push({ pathname: '/player', params: { source: item.source, id: item.id } })}
                >
                  <VideoCard item={{ source: item.source, id: item.id, title: item.title, poster: item.poster } as VideoItem} sourceName={item.sourceName ?? item.source} />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </>
        )}

        {/* Nav row */}
        <Spacer size={24} />
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
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/douban')}
            activeOpacity={0.7}
          >
            <TextView variant="body" style={styles.navButtonText}>
              Douban
            </TextView>
          </TouchableOpacity>
        </View>
        <Spacer size={16} />
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <TextView variant="caption" color={colors.textMuted}>
            Settings
          </TextView>
        </TouchableOpacity>
        <Spacer size={24} />
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  listContent: {
    paddingVertical: 16,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
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
  settingsButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
