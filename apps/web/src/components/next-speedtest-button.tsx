'use client';

import { SpeedtestButton } from '@marstv/ui-web';
import { useRouter } from 'next/navigation';

interface LineProbe {
  index: number;
  source: string;
  name: string;
  url: string;
}

interface Props {
  sourceKey: string;
  videoId: string;
  lines: LineProbe[];
  currentLine: number;
  episode: number;
}

export function NextSpeedtestButton({ sourceKey, videoId, lines, currentLine, episode }: Props) {
  const router = useRouter();

  return (
    <SpeedtestButton
      sourceKey={sourceKey}
      lines={lines}
      currentLine={currentLine}
      onLineSelect={(line) => {
        const winnerIdx = lines.findIndex((l) => l.name === line.line && l.source === line.source);
        const idx = winnerIdx >= 0 ? winnerIdx : 0;
        const href = `/play/${encodeURIComponent(sourceKey)}/${encodeURIComponent(videoId)}?line=${idx}&ep=${episode}`;
        router.push(href);
      }}
    />
  );
}
