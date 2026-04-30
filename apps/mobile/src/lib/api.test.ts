import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { getApiBase, searchVideos, setApiBase } from './api';

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setApiBase / getApiBase', () => {
    it('returns the default placeholder', () => {
      expect(getApiBase()).toBe('https://marstv.example.com');
    });

    it('allows overriding the base URL', () => {
      setApiBase('https://my-marstv.com');
      expect(getApiBase()).toBe('https://my-marstv.com');
      setApiBase('https://marstv.example.com'); // reset
    });
  });

  describe('searchVideos', () => {
    it('returns empty array when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await searchVideos('test');
      expect(result).toEqual([]);
    });

    it('returns empty array on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const result = await searchVideos('test');
      expect(result).toEqual([]);
    });

    it('returns empty array on invalid JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      const result = await searchVideos('test');
      expect(result).toEqual([]);
    });

    it('transforms grouped results to flat hits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              source: { key: 'a', name: 'A源', api: 'https://a.test' },
              items: [{ source: 'a', id: '1', title: 'Test Movie', year: '2024' }],
            },
          ]),
      });
      const result = await searchVideos('test');
      expect(result).toHaveLength(1);
      expect(result[0]?.source.key).toBe('a');
      expect(result[0]?.item.title).toBe('Test Movie');
    });

    it('returns empty array when response is not iterable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const result = await searchVideos('test');
      expect(result).toEqual([]);
    });
  });
});
