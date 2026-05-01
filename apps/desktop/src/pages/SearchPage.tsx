import { searchVideos } from '@marstv/ui-shared';
import type { SearchHit } from '@marstv/ui-shared';
import { useState } from 'react';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function SearchPage({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      setResults(await searchVideos(q));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
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

      {loading && <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Searching...</p>}

      {!loading && searched && results.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>No results found</p>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((hit) => (
            <button
              type="button"
              key={`${hit.source.key}:${hit.item.id}`}
              onClick={() => onNavigate('player', { source: hit.source.key, id: hit.item.id })}
              style={{
                display: 'flex',
                padding: 12,
                borderRadius: 8,
                background: '#1A1A2E',
                border: '1px solid #2A2A3E',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
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
                  {hit.item.category ? ` · ${hit.item.category}` : ''}
                </div>
                {hit.item.remarks && (
                  <div style={{ color: '#FF6B35', fontSize: 11, marginTop: 2 }}>
                    {hit.item.remarks}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
