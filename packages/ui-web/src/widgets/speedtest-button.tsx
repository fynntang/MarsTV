'use client';

import { useState } from 'react';

interface LineProbe {
  index: number;
  source: string;
  name: string;
  /** First episode URL of this line — the probe target. */
  url: string;
}

interface Props {
  sourceKey: string;
  lines: LineProbe[];
  /** Currently-selected line index, so we don't jump the user around if their
   * current line wins or ties — we only navigate when the winner differs. */
  currentLine: number;
  /** Called when a line should be selected (e.g. fastest line wins). */
  onLineSelect: (line: { source: string; line: string; url: string }) => void;
}

interface RankedResult {
  source: string;
  line: string;
  firstChunkMs: number;
  bitrateKbps: number;
  score: number;
}

type ResultRow = { index: number; name: string; result: RankedResult };

export function SpeedtestButton({ sourceKey, lines, currentLine, onLineSelect }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[] | null>(null);

  async function run() {
    if (busy || lines.length === 0) return;
    setBusy(true);
    setError(null);
    setRows(null);
    try {
      const res = await fetch('/api/speedtest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ source: l.source, line: l.name, url: l.url })),
          timeoutMs: 6000,
        }),
      });
      if (!res.ok) throw new Error(`speedtest ${res.status}`);
      const data = (await res.json()) as { results: RankedResult[] };

      // Map results back to the original line index. Line names can repeat in
      // theory, so we match positionally: results are sorted by score, but we
      // need to correlate by (source, line name) *and* pick the first match.
      const used = new Set<number>();
      const mapped: ResultRow[] = [];
      for (const r of data.results) {
        const idx = lines.findIndex(
          (l, i) => !used.has(i) && l.source === r.source && l.name === r.line,
        );
        if (idx >= 0) {
          used.add(idx);
          mapped.push({ index: idx, name: lines[idx]?.name ?? r.line, result: r });
        }
      }
      setRows(mapped);

      // Jump to the winner if it's a live line (score > 0) and different from
      // where the user already is. Preserve current episode index.
      const winner = mapped.find((m) => m.result.score > 0);
      if (winner && winner.index !== currentLine) {
        onLineSelect({
          source: sourceKey,
          line: winner.name,
          url: lines[winner.index]?.url ?? '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'speedtest failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy || lines.length === 0}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-3 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {busy ? '测速中…' : '测速选最快线路'}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {rows ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {rows.map((row) => (
            <li key={`${row.index}:${row.name}`} className="flex items-center gap-2">
              <span
                className={
                  row.index === currentLine
                    ? 'font-medium text-primary'
                    : 'font-medium text-foreground'
                }
              >
                {row.name}
              </span>
              <span>·</span>
              <span>{row.result.score} 分</span>
              <span>·</span>
              <span>{row.result.firstChunkMs < 0 ? '超时' : `${row.result.firstChunkMs}ms`}</span>
              {row.result.bitrateKbps > 0 ? (
                <>
                  <span>·</span>
                  <span>{row.result.bitrateKbps} kbps</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
