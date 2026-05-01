import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../HomePage';

vi.mock('@marstv/ui-shared', () => ({
  fetchDoubanRankings: vi.fn(() => Promise.resolve([])),
  fetchHistory: vi.fn(() => Promise.resolve([])),
  fetchSubscriptions: vi.fn(() => Promise.resolve([])),
}));

describe('HomePage', () => {
  afterEach(() => cleanup());

  it('renders MarsTV title', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('MarsTV')).toBeDefined();
  });

  it('renders Search button', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('Search')).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('shows empty state after loading', async () => {
    render(<HomePage onNavigate={() => {}} />);
    // Wait for useEffect to complete
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText(/No content yet/)).toBeDefined();
  });
});
