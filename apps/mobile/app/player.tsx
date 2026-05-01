import { colors, radius } from '@marstv/config';
import { Container, Spacer, TextView } from '@marstv/ui-native';
import { usePlayerData } from '@marstv/ui-shared';
import { ResizeMode, Video } from 'expo-av';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PlayerScreen() {
  const { source, id, title } = useLocalSearchParams<{
    source: string;
    id: string;
    title: string;
  }>();
  const { lines, videoDetail, loading, error } = usePlayerData(source ?? '', id ?? '');
  const [lineIdx, setLineIdx] = useState(0);
  const [epIdx, setEpIdx] = useState(0);
  const [playError, setPlayError] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  const screenWidth = Dimensions.get('window').width;
  const playerHeight = (screenWidth * 9) / 16;

  const currentLine = lines[lineIdx];
  const currentEp = currentLine?.episodes?.[epIdx];

  const handleLineChange = (i: number) => {
    setLineIdx(i);
    setEpIdx(0);
    setPlayError(null);
  };

  const handleEpChange = (i: number) => {
    setEpIdx(i);
    setPlayError(null);
  };

  if (loading) {
    return (
      <Container style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Player' }} />
        <View style={[styles.playerArea, { height: playerHeight }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Container>
    );
  }

  if (error) {
    return (
      <Container style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Player' }} />
        <View style={[styles.playerArea, styles.center, { height: playerHeight }]}>
          <TextView variant="body" color="#DC2626">
            {error}
          </TextView>
        </View>
      </Container>
    );
  }

  return (
    <Container style={styles.container}>
      <Stack.Screen options={{ title: title ?? 'Player' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Player */}
        <View style={[styles.playerArea, { height: playerHeight }]}>
          {currentEp ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: currentEp.url }}
                style={{ flex: 1 }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
                onError={(errorString: string) => setPlayError(`Playback error: ${errorString}`)}
              />
              {playError && (
                <View style={styles.errorOverlay}>
                  <TextView variant="body" color="#DC2626">
                    {playError}
                  </TextView>
                  <Spacer size={12} />
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      setPlayError(null);
                      handleEpChange(epIdx);
                    }}
                  >
                    <TextView variant="body" color="#FFF">
                      Retry
                    </TextView>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.center}>
              <TextView variant="caption" color={colors.textMuted}>
                No episode available
              </TextView>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBar}>
          <TextView variant="body" style={{ fontWeight: '600' }}>
            {videoDetail?.title ?? title ?? 'Unknown'}
          </TextView>
          {currentEp && (
            <TextView variant="caption" color={colors.textMuted}>
              {currentLine?.name} · Ep. {currentEp.title}
            </TextView>
          )}
        </View>

        {/* Line tabs */}
        {lines.length > 1 && (
          <>
            <Spacer size={12} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lineRow}>
              {lines.map((line, i) => (
                <TouchableOpacity
                  key={line.name}
                  style={[styles.lineTab, i === lineIdx && styles.lineTabActive]}
                  onPress={() => handleLineChange(i)}
                >
                  <TextView variant="caption" color={i === lineIdx ? '#FFF' : colors.textMuted}>
                    {line.name}
                  </TextView>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Episode grid */}
        {currentLine && currentLine.episodes.length > 0 && (
          <>
            <Spacer size={12} />
            <TextView variant="caption" color={colors.textMuted} style={{ paddingHorizontal: 16 }}>
              Episodes
            </TextView>
            <Spacer size={8} />
            <View style={styles.episodeGrid}>
              {currentLine.episodes.map((ep, i) => (
                <TouchableOpacity
                  key={`${ep.title}:${i}`}
                  style={[styles.epButton, i === epIdx && styles.epButtonActive]}
                  onPress={() => handleEpChange(i)}
                >
                  <TextView
                    variant="caption"
                    color={i === epIdx ? colors.primary : colors.textMuted}
                    numberOfLines={1}
                    style={{ textAlign: 'center' }}
                  >
                    {ep.title}
                  </TextView>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Spacer size={24} />
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  playerArea: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  infoBar: {
    padding: 16,
    backgroundColor: colors.surface,
  },
  lineRow: {
    paddingHorizontal: 16,
  },
  lineTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  lineTabActive: {
    backgroundColor: colors.primary,
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 6,
  },
  epButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    minWidth: 64,
  },
  epButtonActive: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,15,0.9)',
    padding: 24,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
});
