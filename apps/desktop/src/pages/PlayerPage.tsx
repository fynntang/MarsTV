import { getDetail } from '@marstv/ui-shared';
import { useEffect, useRef, useState } from 'react';

interface Props {
  source: string;
  id: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface Episode {
  title: string;
  url: string;
}

interface PlayLine {
  name: string;
  episodes: Episode[];
}

interface VideoDetail {
  title: string;
  poster?: string;
  lines: PlayLine[];
  year?: string;
  category?: string;
  desc?: string;
}

export function PlayerPage({ source, id, onNavigate }: Props) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [epIdx, setEpIdx] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDetail(source, id);
        if (cancelled) return;
        if (data) {
          setDetail(data as unknown as VideoDetail);
        } else {
          setError('Failed to load video detail');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !detail) return;

    const lines = detail.lines;
    if (!lines[lineIdx]) return;
    const ep = lines[lineIdx].episodes[epIdx];
    if (!ep) return;

    let cancelled = false;
    let art: { destroy: (removeHtml?: boolean) => void } | null = null;

    (async () => {
      try {
        const [{ default: Artplayer }, { default: Hls }] = await Promise.all([
          import('artplayer'),
          import('hls.js'),
        ]);
        if (cancelled) return;

        const instance = new Artplayer({
          container,
          url: ep.url,
          type: 'm3u8',
          autoplay: true,
          pip: true,
          autoSize: false,
          autoMini: false,
          screenshot: false,
          setting: true,
          playbackRate: true,
          aspectRatio: true,
          theme: '#ff6b35',
          fullscreen: true,
          fullscreenWeb: true,
          moreVideoAttr: { crossOrigin: 'anonymous', preload: 'metadata' },
          customType: {
            m3u8: (video: HTMLVideoElement, url: string, inst: unknown) => {
              if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
                hls.loadSource(url);
                hls.attachMedia(video);
                const a = inst as { on: (event: string, fn: () => void) => void; hls?: unknown };
                a.hls = hls;
                a.on('destroy', () => hls.destroy());
                hls.on(Hls.Events.ERROR, (_evt, data) => {
                  if (!data.fatal) return;
                  setPlayerError(`HLS error: ${data.details ?? data.type ?? 'unknown'}`);
                  try {
                    hls.destroy();
                  } catch {
                    /* ignore */
                  }
                });
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
              } else {
                setPlayerError('HLS playback not supported in this browser');
              }
            },
          },
        });

        art = instance as unknown as { destroy: (removeHtml?: boolean) => void };
      } catch (err) {
        if (!cancelled) setPlayerError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      if (art) {
        try {
          art.destroy(false);
        } catch {
          /* ignore */
        }
      }
    };
  }, [detail, lineIdx, epIdx]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>Loading player...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#DC2626' }}>{error}</p>
        <button
          type="button"
          onClick={() => onNavigate('search')}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#FF6B35',
            color: '#FFF',
            cursor: 'pointer',
          }}
        >
          Back to Search
        </button>
      </div>
    );
  }

  if (!detail) return null;

  const lines = detail.lines;
  const currentLine = lines[lineIdx];
  const currentEp = currentLine?.episodes[epIdx];

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => onNavigate('search')}
        style={{
          background: 'none',
          border: 'none',
          color: '#FF6B35',
          cursor: 'pointer',
          fontSize: 13,
          marginBottom: 12,
          padding: 0,
        }}
      >
        ← Back
      </button>

      {/* Title */}
      <h1 style={{ color: '#FFF', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
        {detail.title}
      </h1>
      {(detail.year || detail.category) && (
        <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
          {[detail.year, detail.category].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Line tabs */}
      {lines.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {lines.map((line, i) => (
            <button
              key={line.name}
              type="button"
              onClick={() => {
                setLineIdx(i);
                setEpIdx(0);
                setPlayerError(null);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                background: i === lineIdx ? '#FF6B35' : '#1A1A2E',
                color: i === lineIdx ? '#FFF' : '#888',
              }}
            >
              {line.name}
            </button>
          ))}
        </div>
      )}

      {/* Episode grid */}
      {currentLine && currentLine.episodes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: 4,
            marginBottom: 16,
          }}
        >
          {currentLine.episodes.map((ep, i) => (
            <button
              key={`${ep.title}:${i}`}
              type="button"
              onClick={() => {
                setEpIdx(i);
                setPlayerError(null);
              }}
              style={{
                padding: '6px 4px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                textAlign: 'center',
                background: i === epIdx ? '#FF6B3520' : '#1A1A2E',
                color: i === epIdx ? '#FF6B35' : '#888',
                borderColor: i === epIdx ? '#FF6B35' : '#2A2A3E',
                borderStyle: 'solid',
                borderWidth: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={ep.title}
            >
              {ep.title}
            </button>
          ))}
        </div>
      )}

      {/* Player */}
      {currentEp && (
        <div
          style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}
        >
          <div
            ref={containerRef}
            className="artplayer-container"
            style={{ aspectRatio: '16/9', width: '100%' }}
          />
          {playerError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'rgba(10,10,15,0.9)',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <p style={{ color: '#DC2626', maxWidth: 400, fontSize: 14 }}>
                Playback failed: {playerError}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPlayerError(null);
                  setEpIdx((n) => n);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#FF6B35',
                  color: '#FFF',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {detail.desc && (
        <p style={{ color: '#888', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>{detail.desc}</p>
      )}
    </div>
  );
}
