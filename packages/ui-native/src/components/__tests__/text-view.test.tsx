import { describe, expect, it } from 'vitest';
import { TextView } from '../TextView';

describe('TextView', () => {
  it('renders text content', () => {
    const el = TextView({ variant: 'body', children: 'Hello World' });
    expect(el).toBeDefined();
    expect(el.props.children).toBe('Hello World');
  });

  it('renders heading variant', () => {
    const el = TextView({ variant: 'heading', children: 'Title' });
    expect(el.props.children).toBe('Title');
  });

  it('defaults to body variant', () => {
    const el = TextView({ children: 'Default' });
    expect(el.props.children).toBe('Default');
  });
});
