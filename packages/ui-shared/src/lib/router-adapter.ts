// Framework-agnostic router adapter.
// Each platform injects its own implementation:
// - Web: next/link + next/navigation
// - Desktop: react-router or custom
// - Mobile: expo-router

export interface RouterAdapter {
  push(href: string): void;
  replace(href: string): void;
  back(): void;
}

interface BrowserGlobal {
  location: {
    href: string;
    replace(url: string): void;
  };
  history: {
    back(): void;
  };
}

function getBrowserGlobal(): BrowserGlobal | undefined {
  if (typeof globalThis !== 'undefined') {
    return globalThis as unknown as BrowserGlobal;
  }
  return undefined;
}

export const noopRouter: RouterAdapter = {
  push(href: string) {
    const g = getBrowserGlobal();
    if (g) g.location.href = href;
  },
  replace(href: string) {
    const g = getBrowserGlobal();
    if (g) g.location.replace(href);
  },
  back() {
    const g = getBrowserGlobal();
    if (g) g.history.back();
  },
};
