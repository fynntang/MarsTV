import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VideoCard } from './video-card';

describe('VideoCard', () => {
  afterEach(() => cleanup());

  const minimal = {
    source: 'test',
    id: '123',
    title: 'Test Video',
  };

  it('renders title', () => {
    render(<VideoCard item={minimal} />);
    expect(screen.getByText('Test Video')).toBeDefined();
  });

  it('renders without year/category gracefully', () => {
    render(<VideoCard item={minimal} />);
    expect(screen.queryByText('Test Video')).toBeTruthy();
  });

  it('renders source badge by default', () => {
    render(<VideoCard item={minimal} />);
    expect(screen.getByText('test')).toBeDefined();
  });

  it('hides source badge when hideSourceBadge is true', () => {
    render(<VideoCard item={minimal} hideSourceBadge />);
    expect(screen.queryByText('test')).toBeNull();
  });

  it('uses custom source name when provided', () => {
    render(<VideoCard item={minimal} sourceName="My Source" />);
    expect(screen.getByText('My Source')).toBeDefined();
  });

  it('renders poster image when poster URL is provided', () => {
    const withPoster = { ...minimal, poster: 'https://example.com/poster.jpg' };
    render(<VideoCard item={withPoster} />);
    const img = screen.getByAltText('Test Video');
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toContain('/api/image/cms');
  });

  it('renders no-cover placeholder when poster is missing', () => {
    render(<VideoCard item={minimal} />);
    expect(screen.getByText('无封面')).toBeDefined();
  });

  it('renders remarks badge when remarks is provided', () => {
    const withRemarks = { ...minimal, remarks: '更新至12集' };
    render(<VideoCard item={withRemarks} />);
    expect(screen.getByText('更新至12集')).toBeDefined();
  });

  it('renders year and area in meta row', () => {
    const withMeta = { ...minimal, year: '2024', area: '中国大陆' };
    render(<VideoCard item={withMeta} />);
    expect(screen.getByText(/2024.*中国大陆/)).toBeDefined();
  });
});
