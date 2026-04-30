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

export const noopRouter: RouterAdapter = {
  push(href: string) {
    if (typeof window !== 'undefined') window.location.href = href;
  },
  replace(href: string) {
    if (typeof window !== 'undefined') window.location.replace(href);
  },
  back() {
    if (typeof window !== 'undefined') window.history.back();
  },
};
