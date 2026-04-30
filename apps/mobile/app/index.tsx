import { StyleSheet, ScrollView, View } from 'react-native';
import { Container, Spacer, VideoCard } from '@marstv/ui-native';
import { colors } from '@marstv/config';
import type { VideoItem } from '@marstv/core';

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
  return (
    <Container style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {mockItems.map(({ item, sourceName }) => (
          <View key={item.id} style={styles.cardWrapper}>
            <VideoCard item={item} sourceName={sourceName} />
          </View>
        ))}
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
});
