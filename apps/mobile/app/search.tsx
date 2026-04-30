import { colors, fontSize, radius, spacing } from '@marstv/config';
import { Container, Spacer, TextView, VideoCard } from '@marstv/ui-native';
import { useCmsSearch } from '@marstv/ui-shared';
import type { SearchHit } from '@marstv/ui-shared';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { results, loading, error, searched, search } = useCmsSearch();

  const handleSearch = () => {
    search(query);
  };

  return (
    <Container style={styles.container}>
      <SearchBox query={query} onChange={setQuery} onSubmit={handleSearch} />
      {!searched && !loading && !error && <InitialView />}
      {loading && <LoadingIndicator />}
      {error && <ErrorView message={error} />}
      {!loading && !error && searched && results.length === 0 && <EmptyView />}
      {!loading && !error && <ResultList results={results} />}
    </Container>
  );
}

function SearchBox({
  query,
  onChange,
  onSubmit,
}: {
  query: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.searchBox}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search videos..."
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.searchButton} onPress={onSubmit} activeOpacity={0.7}>
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingIndicator() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Spacer size={spacing[6]} />
      <TextView variant="heading" color={colors.danger}>
        Error
      </TextView>
      <Spacer size={spacing[2]} />
      <TextView variant="body" color={colors.textMuted}>
        {message}
      </TextView>
    </View>
  );
}

function InitialView() {
  return (
    <View style={styles.center}>
      <TextView variant="heading" color={colors.textMuted}>
        {'🔍 Search videos across all sources'}
      </TextView>
    </View>
  );
}

function EmptyView() {
  return (
    <View style={styles.center}>
      <Spacer size={spacing[6]} />
      <TextView variant="heading" color={colors.textMuted}>
        No results found
      </TextView>
      <Spacer size={spacing[2]} />
      <TextView variant="caption" color={colors.textDim}>
        Try a different search term
      </TextView>
    </View>
  );
}

function ResultList({ results }: { results: SearchHit[] }) {
  return (
    <FlatList
      data={results}
      keyExtractor={(hit) => `${hit.source.key}-${hit.item.id}`}
      contentContainerStyle={styles.listContent}
      renderItem={({ item: hit }) => (
        <VideoCard
          item={hit.item}
          sourceName={hit.source.name}
          onPress={() =>
            router.push({
              pathname: '/player',
              params: {
                source: hit.item.source,
                id: hit.item.id,
                title: hit.item.title,
              },
            })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  searchBox: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.text,
  },
  searchButton: {
    height: 44,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing[4],
  },
});
