import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OverlayApp, stageSizeOf } from './overlay-app';
import type { PositionStorage } from './overlay-position';

afterEach(cleanup);

const storage: PositionStorage = {
  get: async () => ({}),
  set: async () => undefined,
};

const cornerStorage: PositionStorage = {
  get: async (key) => (key === 'eidolon.canvasOverlay.position' ? { [key]: { x: 150, y: 150 } } : {}),
  set: async () => undefined,
};

describe('OverlayApp', () => {
  it('keeps the page surface click-through while its stage is interactive', () => {
    render(<OverlayApp positionStore={storage} />);
    expect(screen.getByTestId('overlay-root')).toHaveStyle({ pointerEvents: 'none', background: 'transparent' });
    expect(screen.getByTestId('overlay-stage')).toHaveStyle({ pointerEvents: 'auto' });
  });

  it('opens the only menu from its accessible Key control', () => {
    render(<OverlayApp positionStore={storage} />);
    const button = screen.getByRole('button', { name: 'AI settings' });

    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('AI settings');
    fireEvent.click(button);

    expect(screen.getByText('AI disabled')).toBeVisible();
    expect(screen.getByText('Autonomous motion is active')).toBeVisible();
  });

  it('lists the models as a right-side column under the Choose model button', () => {
    render(<OverlayApp positionStore={storage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose model' }));

    const dialog = screen.getByRole('dialog', { name: 'Choose model' });
    const options = Array.from(dialog.querySelectorAll('button')).map((button) => button.textContent?.trim());
    expect(options).toEqual(['Blob', 'Shapes']);
  });

  it('toggles the resize tool on and off from its own action button', () => {
    render(<OverlayApp positionStore={storage} />);
    expect(screen.queryByRole('button', { name: /Resize shape from/ })).toBeNull();

    const toggle = screen.getByRole('button', { name: 'Resize tool' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /Resize shape from/ })).toHaveLength(4);

    fireEvent.click(toggle);
    expect(screen.queryByRole('button', { name: /Resize shape from/ })).toBeNull();
  });

  it('grows the stage from the bottom-right grip while holding the top-left corner', async () => {
    render(<OverlayApp positionStore={cornerStorage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resize tool' }));

    const stage = screen.getByTestId('overlay-stage');
    await waitFor(() => expect(stage.style.left).toBe('150px'));
    const startLeft = stage.style.left;
    const startTop = stage.style.top;
    const grip = screen.getByRole('button', { name: 'Resize shape from bottom right' });

    fireEvent.pointerDown(grip, { pointerId: 1, clientX: 320, clientY: 320 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 420, clientY: 420 });

    expect(parseFloat(stage.style.width)).toBe(stageSizeOf(400));
    expect(stage.style.left).toBe(startLeft);
    expect(stage.style.top).toBe(startTop);
  });

  it('grows the stage from the top-left grip while holding the bottom-right corner', async () => {
    render(<OverlayApp positionStore={cornerStorage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resize tool' }));

    const stage = screen.getByTestId('overlay-stage');
    await waitFor(() => expect(stage.style.left).toBe('150px'));
    const startLeft = parseFloat(stage.style.left);
    const startTop = parseFloat(stage.style.top);
    const grip = screen.getByRole('button', { name: 'Resize shape from top left' });

    fireEvent.pointerDown(grip, { pointerId: 1, clientX: 320, clientY: 320 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 220, clientY: 220 });

    expect(parseFloat(stage.style.width)).toBe(stageSizeOf(400));
    expect(parseFloat(stage.style.left)).toBe(startLeft - 100);
    expect(parseFloat(stage.style.top)).toBe(startTop - 100);
  });

  it('shows a static fallback when Canvas 2D is unavailable', () => {
    render(<OverlayApp positionStore={storage} onCanvasReady={() => { throw new Error('Canvas 2D is unavailable'); }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Canvas 2D is unavailable');
  });
});