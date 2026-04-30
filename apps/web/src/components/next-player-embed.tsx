'use client';

import { getClientStorage } from '@/lib/client-storage';
import { NextLinkComponent } from '@/lib/next-adapter';
import { PlayerEmbed } from '@marstv/ui-web';
import { useRouter } from 'next/navigation';

interface Props {
  src: string;
  poster?: string;
  title?: string;
  progressKey?: string;
  nextHref?: string;
  prevHref?: string;
  nextPlaybackUrl?: string;
  nextLineHref?: string;
  nextLineName?: string;
  record?: {
    source: string;
    sourceName?: string;
    id: string;
    title: string;
    poster?: string;
    lineIdx: number;
    lineName?: string;
    epIdx: number;
  };
}

export function NextPlayerEmbed(props: Props) {
  const router = useRouter();
  const storage = getClientStorage();

  return (
    <PlayerEmbed
      {...props}
      onNavigate={(href) => router.push(href)}
      LinkComponent={NextLinkComponent}
      storage={storage}
    />
  );
}
