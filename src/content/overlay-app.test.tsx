import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverlayApp } from './overlay-app';

describe('OverlayApp', () => {
  it('keeps the page surface click-through while its drag handle is interactive', () => {
    render(<OverlayApp onHide={() => undefined} status="Ready" />);
    expect(screen.getByTestId('overlay-root')).toHaveStyle({ pointerEvents: 'none', background: 'transparent' });
    expect(screen.getByRole('button', { name: 'Move avatar' })).toHaveStyle({ pointerEvents: 'auto' });
  });
});
