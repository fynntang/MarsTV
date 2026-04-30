import { colors, radius } from '@marstv/config';
import { Container, Spacer, TextView } from '@marstv/ui-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

// Categories match the web douban page
const CATEGORIES = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

export default function DoubanScreen() {
  const [tag, setTag] = useState('movie');
  const [loading, _setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <Container>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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

        {/* Category tabs */}
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
          <TextView
            variant="caption"
            color={colors.textMuted}
            style={{ textAlign: 'center', marginTop: 40 }}
          >
            Connect to Douban API to load rankings
          </TextView>
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
