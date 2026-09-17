import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OverlayApp } from './overlay-app';

afterEach(cleanup);

describe('OverlayApp', () => {
  it('keeps the page surface click-through while its stage is interactive', () => {
    render(<OverlayApp />);
    expect(screen.getByTestId('overlay-root')).toHaveStyle({ pointerEvents: 'none', background: 'transparent' });
    expect(screen.getByTestId('overlay-stage')).toHaveStyle({ pointerEvents: 'auto' });
  });

  it('opens the only menu from its accessible Key control', () => {
    render(<OverlayApp />);
    const button = screen.getByRole('button', { name: 'AI settings' });

    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('AI settings');
    fireEvent.click(button);

    expect(screen.getByText('AI disabled')).toBeVisible();
    expect(screen.getByText('Autonomous motion is active')).toBeVisible();
  });

  it('shows a static fallback when Canvas 2D is unavailable', () => {
    render(<OverlayApp onCanvasReady={() => { throw new Error('Canvas 2D is unavailable'); }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Canvas 2D is unavailable');
  });
});
