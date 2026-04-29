// ============================================================================
// Source speedtest — probe one or more playback URLs in parallel and produce
// a ranked score. Used to pick the fastest line among multiple CMS sources.
//
// Strategy (M1 baseline — extend with segment sampling later):
//   1. Fetch the m3u8 playlist with an 8s hard timeout.
//   2. Measure first-byte time + total playlist read time.
//   3. If the playlist is a master, take the highest advertised BANDWIDTH.
//   4. Score = 0.7 * latencyScore + 0.3 * bitrateScore.
//
// Intentionally does NOT download TS segments — that's tens of megabytes per
// probe and defeats the point of "fast ranking". A latency-heavy weighting is
// correct: CMS lines that respond fast almost always stream fast too.
// ============================================================================

import type { SpeedTestResult } from '../types/index';

export interface SpeedTestInput {
  source: string;
  line: string;
  url: string;
}

export interface SpeedTestOptions {
  /** Per-probe timeout; default 8000ms. */
  timeoutMs?: number;
  /** Optional external AbortSignal (e.g. request cancelled). */
  signal?: AbortSignal;
}

// Anchor points for the latency score: ≤200ms is perfect, ≥2000ms is zero.
const LATENCY_GOOD_MS = 200;
const LATENCY_BAD_MS = 2000;
// Anchor points for the bitrate score: ≥4000kbps is perfect, ≤500kbps is zero.
const BITRATE_GOOD_KBPS = 4000;
const BITRATE_BAD_KBPS = 500;

const LATENCY_WEIGHT = 0.7;
const BITRATE_WEIGHT = 0.3;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function latencyScore(firstChunkMs: number): number {
  if (firstChunkMs < 0) return 0;
  if (firstChunkMs <= LATENCY_GOOD_MS) return 1;
  if (firstChunkMs >= LATENCY_BAD_MS) return 0;
  // Linear between anchors.
  return clamp01(1 - (firstChunkMs - LATENCY_GOOD_MS) / (LATENCY_BAD_MS - LATENCY_GOOD_MS));
}

function bitrateScore(kbps: number): number {
  if (!Number.isFinite(kbps) || kbps <= 0) return 0.3; // unknown → neutral-low
  if (kbps >= BITRATE_GOOD_KBPS) return 1;
  if (kbps <= BITRATE_BAD_KBPS) return 0;
  return clamp01((kbps - BITRATE_BAD_KBPS) / (BITRATE_GOOD_KBPS - BITRATE_BAD_KBPS));
}

function composeScore(firstChunkMs: number, kbps: number): number {
  if (firstChunkMs < 0) return 0;
  const s = LATENCY_WEIGHT * latencyScore(firstChunkMs) + BITRATE_WEIGHT * bitrateScore(kbps);
  return Math.round(s * 100);
}

// Parse the highest BANDWIDTH=... value from a master playlist. Returns 0 when
// the playlist is a media playlist (no EXT-X-STREAM-INF lines) or on any
// parse hiccup — the caller treats 0 as "unknown".
function parseMaxBandwidthKbps(playlist: string): number {
  let max = 0;
  const lines = playlist.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
    const m = line.match(/BANDWIDTH=(\d+)/i);
    if (!m || !m[1]) continue;
    const bps = Number.parseInt(m[1], 10);
    if (Number.isFinite(bps) && bps > max) max = bps;
  }
  return Math.round(max / 1000);
}

export async function testLine(
  input: SpeedTestInput,
  opts: SpeedTestOptions = {},
): Promise<SpeedTestResult> {
  const { timeoutMs = 8000, signal: externalSignal } = opts;

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (externalSignal) {
    if (externalSignal.aborted) ctrl.abort();
    else externalSignal.addEventListener('abort', onAbort);
  }

  const started = Date.now();
  try {
    const res = await fetch(input.url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        accept: 'application/vnd.apple.mpegurl, application/x-mpegurl, */*',
        'user-agent': 'Mozilla/5.0 (compatible; MarsTV/0.1 SpeedTest)',
      },
    });

    if (!res.ok) {
      return { source: input.source, line: input.line, firstChunkMs: -1, bitrateKbps: 0, score: 0 };
    }

    // "First chunk" = time to full playlist read (m3u8 playlists are tiny,
    // a few KB at most, so first-byte ≈ full-read in practice).
    const text = await res.text();
    const firstChunkMs = Date.now() - started;
    const bitrateKbps = parseMaxBandwidthKbps(text);

    return {
      source: input.source,
      line: input.line,
      firstChunkMs,
      bitrateKbps,
      score: composeScore(firstChunkMs, bitrateKbps),
    };
  } catch {
    return { source: input.source, line: input.line, firstChunkMs: -1, bitrateKbps: 0, score: 0 };
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
  }
}

export async function rankLines(
  inputs: SpeedTestInput[],
  opts: SpeedTestOptions = {},
): Promise<SpeedTestResult[]> {
  const results = await Promise.all(inputs.map((input) => testLine(input, opts)));
  // Higher score first; break ties by faster latency.
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aLat = a.firstChunkMs < 0 ? Number.POSITIVE_INFINITY : a.firstChunkMs;
    const bLat = b.firstChunkMs < 0 ? Number.POSITIVE_INFINITY : b.firstChunkMs;
    return aLat - bLat;
  });
}

// Exported for tests. Not intended as a public API.
export const _internal = { parseMaxBandwidthKbps, latencyScore, bitrateScore, composeScore };
