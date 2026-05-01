import type { CmsSource } from '@marstv/core';
import type { SourceStore } from '@marstv/ui-shared';
import * as FileSystem from 'expo-file-system/legacy';

const filePath = `${FileSystem.documentDirectory}sources.json`;

export const expoSourceStore: SourceStore = {
  async load(): Promise<CmsSource[]> {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) return [];
      const raw = await FileSystem.readAsStringAsync(filePath);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async save(sources: CmsSource[]): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(sources));
    } catch {
      /* ignore */
    }
  },
};
