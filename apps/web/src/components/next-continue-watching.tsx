'use client';

import { getClientStorage } from '@/lib/client-storage';
import { NextLinkComponent } from '@/lib/next-adapter';
import type { PlayRecord } from '@marstv/core';
import { ContinueWatchingRow, invalidateCardMarkers } from '@marstv/ui-web';
import { useEffect, useState } from 'react';

const FINISHED_THRESHOLD = 0.95;
const MAX_ITEMS = 12;

function usable(r: PlayRecord): boolean {
  if (!(r.durationSec > 0)) return true;
  return r.positionSec / r.durationSec < FINISHED_THRESHOLD;
}

export function NextContinueWatching() {
  const [items, setItems] = useState<PlayRecord[] | null>(null);

  useEffect(() => {
    getClientStorage()
      .listPlayRecords()
      .then((records) => setItems(records.filter(usable).slice(0, MAX_ITEMS)))
      .catch(() => setItems([]));
  }, []);

  async function remove(source: string, id: string) {
    await getClientStorage().removePlayRecord(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  return <ContinueWatchingRow items={items} onRemove={remove} LinkComponent={NextLinkComponent} />;
}
