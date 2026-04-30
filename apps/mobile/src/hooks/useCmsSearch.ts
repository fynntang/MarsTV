import { useCallback, useState } from 'react';
import { type SearchHit, searchVideos } from '../lib/api';

interface UseCmsSearchResult {
  results: SearchHit[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useCmsSearch(): UseCmsSearchResult {
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const hits = await searchVideos(q);
      setResults(hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setSearched(false);
  }, []);

  return { results, loading, error, searched, search, clearResults };
}
