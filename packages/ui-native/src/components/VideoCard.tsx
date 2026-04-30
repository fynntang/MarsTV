import { colors, fontSize, radius } from '@marstv/config';
import type { VideoItem } from '@marstv/core';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isTV } from '../shared/platform.js';

interface VideoCardProps {
  item: VideoItem;
  sourceName: string;
  onPress?: () => void;
  /** When true, the TV focus engine prefers this element on mount. tvOS only. */
  hasTVPreferredFocus?: boolean;
}

export function VideoCard({
  item,
  sourceName,
  onPress,
  hasTVPreferredFocus = false,
}: VideoCardProps) {
  const [focused, setFocused] = useState(false);
  const tv = isTV();

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tv && styles.cardTV,
        focused && styles.cardFocused,
        pressed && !tv && { opacity: 0.7 },
      ]}
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <View style={[styles.poster, tv && styles.posterTV]}>
        <Text style={[styles.posterPlaceholder, tv && styles.posterPlaceholderTV]}>🎬</Text>
      </View>
      <View style={[styles.info, tv && styles.infoTV]}>
        <Text style={[styles.title, tv && styles.titleTV]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.meta, tv && styles.metaTV]}>
          {item.year ?? ''} · {sourceName}
        </Text>
      </View>
    </Pressable>
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
  cardTV: {
    flexDirection: 'column',
    padding: 16,
    marginBottom: 16,
    borderRadius: radius.lg,
  },
  cardFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: colors.primary,
    borderWidth: 2,
  },
  poster: {
    width: 80,
    height: 110,
    backgroundColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterTV: {
    width: '100%' as const,
    height: 200,
    borderRadius: radius.md,
  },
  posterPlaceholder: { fontSize: 32 },
  posterPlaceholderTV: { fontSize: 48 },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  infoTV: {
    marginLeft: 0,
    marginTop: 12,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  titleTV: {
    fontSize: fontSize.lg,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  metaTV: {
    fontSize: fontSize.base,
  },
});
