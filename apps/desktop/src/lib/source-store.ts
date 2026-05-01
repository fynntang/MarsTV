import type { CmsSource } from '@marstv/core';
import type { SourceStore } from '@marstv/ui-shared';
import { invoke } from '@tauri-apps/api/core';

export const tauriSourceStore: SourceStore = {
  async load(): Promise<CmsSource[]> {
    try {
      const raw: string = await invoke('load_sources');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async save(sources: CmsSource[]): Promise<void> {
    await invoke('save_sources', { sourcesJson: JSON.stringify(sources) });
  },
};
