import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, radius } from '@marstv/config';
import type { VideoItem } from '@marstv/core';

interface VideoCardProps {
  item: VideoItem;
  sourceName: string;
  onPress?: () => void;
}

export function VideoCard({ item, sourceName, onPress }: VideoCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.poster}>
        <Text style={styles.posterPlaceholder}>🎬</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta}>
          {item.year ?? ''} · {sourceName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  poster: {
    width: 80,
    height: 110,
    backgroundColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholder: { fontSize: 32 },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
