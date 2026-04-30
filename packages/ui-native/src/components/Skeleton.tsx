import { colors, radius } from '@marstv/config';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius?.sm ?? 4,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  // biome-ignore lint/suspicious/noExplicitAny: Animated.View style requires loose typing for Animated.Value + DimensionValue union
  const skeletonStyle: any = [
    { width, height, borderRadius, opacity },
    { backgroundColor: colors?.surfaceElevated ?? '#2A2A3E' },
  ];

  return <Animated.View style={skeletonStyle} />;
}

export function PosterSkeleton() {
  return (
    <View style={{ flexDirection: 'row', padding: 12 }}>
      <Skeleton width={80} height={110} borderRadius={6} />
      <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
        <Skeleton width="80%" height={18} />
        <View style={{ height: 8 }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
}
