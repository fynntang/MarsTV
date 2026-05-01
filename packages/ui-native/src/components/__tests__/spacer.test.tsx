import { describe, expect, it } from 'vitest';
import { Spacer } from '../Spacer';

describe('Spacer', () => {
  it('renders with default size', () => {
    const el = Spacer({});
    expect(el).toBeDefined();
    expect(el.props.style).toMatchObject({ height: 16, width: 16 });
  });

  it('renders with given size', () => {
    const el = Spacer({ size: 32 });
    expect(el.props.style).toMatchObject({ height: 32, width: 32 });
  });
});
