import { fetchDoubanRankings, fetchHistory, fetchSubscriptions } from '@marstv/ui-shared';
import { useEffect, useState } from 'react';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface SimpleItem {
  source: string;
  id: string;
  title: string;
  poster?: string;
  year?: string;
  rating?: number;
}

export function HomePage({ onNavigate }: Props) {
  const [continueItems, setContinueItems] = useState<SimpleItem[]>([]);
  const [doubanItems, setDoubanItems] = useState<SimpleItem[]>([]);
  const [subItems, setSubItems] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [douban, history, subs] = await Promise.all([
          fetchDoubanRankings('movie', undefined, 10),
          fetchHistory(),
          fetchSubscriptions(),
        ]);
        setDoubanItems(
          (douban as Array<Record<string, unknown>>).map((d) => ({
            source: (d.source as string) ?? 'douban',
            id: String(d.id ?? ''),
            title: (d.title as string) ?? '',
            poster: d.poster as string | undefined,
            year: d.year as string | undefined,
            rating:
              typeof d.rating === 'number'
                ? d.rating
                : typeof d.score === 'number'
                  ? d.score
                  : undefined,
          })),
        );
        setContinueItems(
          (history as Array<Record<string, unknown>>).map((r) => ({
            source: r.source as string,
            id: r.id as string,
            title: r.title as string,
            poster: r.poster as string | undefined,
          })),
        );
        setSubItems(
          (subs as Array<Record<string, unknown>>).map((r) => ({
            source: r.source as string,
            id: r.id as string,
            title: r.title as string,
            poster: r.poster as string | undefined,
          })),
        );
      } catch {
        /* empty */
      }
      setLoading(false);
    }
    load();
  }, []);

  const cardStyle: React.CSSProperties = {
    width: 140,
    flexShrink: 0,
    cursor: 'pointer',
  };

  const posterStyle: React.CSSProperties = {
    width: 140,
    height: 190,
    borderRadius: 6,
    background: '#2A2A3E',
    objectFit: 'cover',
  };

  const titleStyle: React.CSSProperties = {
    color: '#CCC',
    fontSize: 12,
    marginTop: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ color: '#FF6B35', fontSize: 24, margin: 0 }}>MarsTV</h1>
        <button
          type="button"
          onClick={() => onNavigate('search')}
          style={{
            marginLeft: 'auto',
            height: 36,
            padding: '0 16px',
            borderRadius: 6,
            border: 'none',
            background: '#FF6B35',
            color: '#FFF',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Search
        </button>
      </div>

      {loading && <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Loading...</p>}

      {!loading &&
        continueItems.length === 0 &&
        doubanItems.length === 0 &&
        subItems.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
            No content yet. Start by searching for videos.
          </p>
        )}

      {/* Continue Watching */}
      {continueItems.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#CCC', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Continue Watching
          </h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {continueItems.map((item) => (
              <button
                type="button"
                key={`${item.source}:${item.id}`}
                style={{
                  ...cardStyle,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                }}
                onClick={() => onNavigate('player', { source: item.source, id: item.id })}
              >
                {item.poster ? (
                  <img src={item.poster} alt={item.title} style={posterStyle} />
                ) : (
                  <div style={posterStyle} />
                )}
                <div style={titleStyle}>{item.title}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Douban Rankings */}
      {doubanItems.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#CCC', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Douban Rankings
          </h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {doubanItems.map((item, i) => (
              <div key={`douban-${item.id || i}`} style={cardStyle}>
                {item.poster ? (
                  <img src={item.poster} alt={item.title} style={posterStyle} />
                ) : (
                  <div style={posterStyle} />
                )}
                <div style={titleStyle}>{item.title}</div>
                {item.rating && (
                  <div style={{ color: '#FF6B35', fontSize: 11 }}>★ {item.rating.toFixed(1)}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Subscriptions */}
      {subItems.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#CCC', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            My Subscriptions
          </h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {subItems.map((item) => (
              <button
                type="button"
                key={`${item.source}:${item.id}`}
                style={{
                  ...cardStyle,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                }}
                onClick={() => onNavigate('player', { source: item.source, id: item.id })}
              >
                {item.poster ? (
                  <img src={item.poster} alt={item.title} style={posterStyle} />
                ) : (
                  <div style={posterStyle} />
                )}
                <div style={titleStyle}>{item.title}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
