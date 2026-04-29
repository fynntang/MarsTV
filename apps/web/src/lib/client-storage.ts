// ============================================================================
// Client-side IStorage factory.
//
// Reads `window.__MARSTV_CLOUD_STORAGE__` (injected by the root layout when
// cloud storage is enabled server-side) to decide between:
//   - Remote IStorage (cloud): hits /api/storage/* routes
//   - Local IStorage (default): browser localStorage (M1 behavior)
//
// Components should call `getClientStorage()` instead of importing
// `localStorageBackend` directly, so the backend can switch transparently.
// ============================================================================

'use client';

import { type IStorage, localStorageBackend } from '@marstv/core';
import { createRemoteStorage } from './remote-storage';

declare global {
  interface Window {
    __MARSTV_CLOUD_STORAGE__?: boolean;
  }
}

let _cached: IStorage | null = null;

export function getClientStorage(): IStorage {
  if (_cached) return _cached;
  const cloud = typeof window !== 'undefined' && window.__MARSTV_CLOUD_STORAGE__ === true;
  _cached = cloud ? createRemoteStorage() : localStorageBackend;
  return _cached;
}

/** Test hook — reset singleton between cases. */
export function _resetClientStorageForTests(): void {
  _cached = null;
}
