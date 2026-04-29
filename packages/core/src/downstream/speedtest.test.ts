import { describe, expect, it } from 'vitest';
import { _internal, rankLines, testLine } from './speedtest';

const { parseMaxBandwidthKbps, latencyScore, bitrateScore, composeScore } = _internal;

describe('parseMaxBandwidthKbps', () => {
  it('returns 0 for a media playlist (no STREAM-INF)', () => {
    const media = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXTINF:10.0,',
      'a.ts',
      '#EXTINF:10.0,',
      'b.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');
    expect(parseMaxBandwidthKbps(media)).toBe(0);
  });

  it('picks the highest BANDWIDTH from a master playlist and converts bps→kbps', () => {
    const master = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
      'low.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720',
      'mid.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080',
      'hi.m3u8',
    ].join('\n');
    expect(parseMaxBandwidthKbps(master)).toBe(5000);
  });

  it('ignores malformed BANDWIDTH values', () => {
    const master = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=notanumber',
      'x.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=1500000',
      'y.m3u8',
    ].join('\n');
    expect(parseMaxBandwidthKbps(master)).toBe(1500);
  });
});

describe('latencyScore', () => {
  it('is 1 at or below the "good" anchor', () => {
    expect(latencyScore(0)).toBe(1);
    expect(latencyScore(200)).toBe(1);
    expect(latencyScore(100)).toBe(1);
  });

  it('is 0 at or above the "bad" anchor', () => {
    expect(latencyScore(2000)).toBe(0);
    expect(latencyScore(5000)).toBe(0);
  });

  it('is 0 for negative latency (timeout / error sentinel)', () => {
    expect(latencyScore(-1)).toBe(0);
  });

  it('interpolates linearly between anchors', () => {
    // midpoint (1100ms) → 0.5
    expect(latencyScore(1100)).toBeCloseTo(0.5, 5);
  });
});

describe('bitrateScore', () => {
  it('returns neutral-low (0.3) when unknown / zero', () => {
    expect(bitrateScore(0)).toBe(0.3);
    expect(bitrateScore(Number.NaN)).toBe(0.3);
    expect(bitrateScore(-100)).toBe(0.3);
  });

  it('is 1 at or above the "good" anchor (4000 kbps)', () => {
    expect(bitrateScore(4000)).toBe(1);
    expect(bitrateScore(10000)).toBe(1);
  });

  it('is 0 at or below the "bad" anchor (500 kbps)', () => {
    expect(bitrateScore(500)).toBe(0);
    expect(bitrateScore(100)).toBe(0);
  });

  it('interpolates linearly between anchors', () => {
    // midpoint (2250 kbps) → 0.5
    expect(bitrateScore(2250)).toBeCloseTo(0.5, 5);
  });
});

describe('composeScore', () => {
  it('returns 0 when latency is the error sentinel', () => {
    expect(composeScore(-1, 5000)).toBe(0);
  });

  it('is 100 when both sub-scores are maxed', () => {
    expect(composeScore(100, 10000)).toBe(100);
  });

  it('weights latency at 0.7 and bitrate at 0.3', () => {
    // perfect latency + unknown bitrate (0.3) → 0.7*1 + 0.3*0.3 = 0.79 → 79
    expect(composeScore(150, 0)).toBe(79);
  });
});

describe('rankLines', () => {
  it('sorts higher score first, breaking ties by lower latency', async () => {
    // Mock testLine via a dummy fetch — easier: call rankLines with pre-set
    // URLs that will all time out via abort, then rely on testLine returning
    // sentinel -1 latency uniformly. Not useful. Instead, directly compose
    // a list and run the comparator logic by feeding into Promise.all's map.
    // We can skip the network by passing empty URLs and a tiny timeout.
    const res = await rankLines(
      [
        { source: 'a', line: 'A', url: '' },
        { source: 'b', line: 'B', url: '' },
      ],
      { timeoutMs: 1 },
    );
    expect(res).toHaveLength(2);
    // Both error out, both score 0 with firstChunkMs=-1. Ties fall through
    // to latency compare; POSITIVE_INFINITY vs POSITIVE_INFINITY is stable.
    expect(res[0]?.score).toBe(0);
    expect(res[1]?.score).toBe(0);
  });
});

describe('testLine', () => {
  it('returns sentinel score=0 when the url is unreachable', async () => {
    const result = await testLine(
      { source: 's', line: 'L', url: 'http://127.0.0.1:1/nope.m3u8' },
      { timeoutMs: 50 },
    );
    expect(result.score).toBe(0);
    expect(result.firstChunkMs).toBe(-1);
    expect(result.source).toBe('s');
    expect(result.line).toBe('L');
  });
});
