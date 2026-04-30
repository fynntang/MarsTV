import { searchVideos } from '@marstv/ui-shared';
import type { SearchHit } from '@marstv/ui-shared';
import { useState } from 'react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate: _onNavigate }: HomePageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const hits = await searchVideos(query);
      setResults(hits);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ color: '#FF6B35', fontSize: 24, marginBottom: 8 }}>MarsTV</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
        Cross-platform video aggregation ·{' '}
        {results.length > 0 ? `${results.length} results` : 'Search to begin'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search videos..."
          style={{
            flex: 1,
            height: 40,
            padding: '0 12px',
            borderRadius: 6,
            border: '1px solid #2A2A3E',
            background: '#1A1A2E',
            color: '#FFF',
            fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 6,
            border: 'none',
            background: '#FF6B35',
            color: '#FFF',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </div>

      {loading && <p style={{ color: '#888' }}>Searching...</p>}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((hit) => (
            <div
              key={`${hit.source.key}:${hit.item.id}`}
              style={{
                display: 'flex',
                padding: 12,
                borderRadius: 8,
                background: '#1A1A2E',
                border: '1px solid #2A2A3E',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 80,
                  background: '#2A2A3E',
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              />
              <div style={{ marginLeft: 12 }}>
                <div style={{ color: '#FFF', fontWeight: 600 }}>{hit.item.title}</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  {hit.item.year ?? '—'} · {hit.source.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
