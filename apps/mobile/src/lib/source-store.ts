import { Paths, File } from 'expo-file-system';
import type { CmsSource } from '@marstv/core';
import type { SourceStore } from '@marstv/ui-shared';

const sourcesFile = new File(Paths.document, 'sources.json');

export const expoSourceStore: SourceStore = {
  async load(): Promise<CmsSource[]> {
    try {
      if (!sourcesFile.exists) return [];
      const raw = await sourcesFile.text();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async save(sources: CmsSource[]): Promise<void> {
    try {
      sourcesFile.write(JSON.stringify(sources));
    } catch { /* ignore */ }
  },
};
