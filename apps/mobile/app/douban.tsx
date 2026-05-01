import { colors, radius } from '@marstv/config';
import type { VideoItem } from '@marstv/core';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { fetchDoubanRankings } from '@marstv/ui-shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const CATEGORIES = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

export default function DoubanScreen() {
  const [tag, setTag] = useState('movie');
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDoubanRankings(tag)
      .then((items) => {
        setData(items);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
  }, [tag]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await fetchDoubanRankings(tag);
      setData(items);
    } catch {
      setData([]);
    }
    setRefreshing(false);
  }, [tag]);

  return (
    <Container>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <TextView variant="heading">Douban Rankings</TextView>
        <Spacer size={8} />
        <TextView variant="caption" color={colors.textMuted}>
          Top-rated movies and TV shows from Douban
        </TextView>
        <Spacer size={16} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.tab, tag === cat.key && styles.tabActive]}
              onPress={() => setTag(cat.key)}
              activeOpacity={0.7}
            >
              <TextView variant="body" color={tag === cat.key ? '#FFFFFF' : colors.textMuted}>
                {cat.label}
              </TextView>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Spacer size={16} />

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={data}
            scrollEnabled={false}
            keyExtractor={(_, i) => `douban-${i}`}
            renderItem={({ item }) => {
              const d = item as Record<string, unknown>;
              const videoItem: VideoItem = {
                source: (d.source as string) ?? 'douban',
                id: String(d.id ?? ''),
                title: (d.title as string) ?? '',
                poster: d.poster as string | undefined,
                rating:
                  typeof d.rate === 'number'
                    ? d.rate
                    : typeof d.score === 'number'
                      ? d.score
                      : d.rate != null
                        ? Number.parseFloat(String(d.rate))
                        : d.score != null
                          ? Number.parseFloat(String(d.score))
                          : undefined,
              };
              return (
                <VideoCard
                  item={videoItem}
                  sourceName={(d.sourceName as string) ?? 'douban'}
                  onPress={() =>
                    router.push({
                      pathname: '/player',
                      params: {
                        source: videoItem.source,
                        id: videoItem.id,
                        title: videoItem.title,
                      },
                    })
                  }
                />
              );
            }}
            contentContainerStyle={{ gap: 12 }}
          />
        )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  tabs: { flexDirection: 'row', marginBottom: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
});
