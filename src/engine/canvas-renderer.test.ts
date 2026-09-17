import { describe, expect, it, vi } from 'vitest';
import { CanvasRenderer } from './canvas-renderer';
import type { VisualState } from './types';

function createContext(): CanvasRenderingContext2D {
  return {
    canvas: document.createElement('canvas'), clearRect: vi.fn(), setTransform: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), bezierCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fillText: vi.fn(), createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  } as unknown as CanvasRenderingContext2D;
}

describe('CanvasRenderer', () => {
  it('draws a path and text on a transparent canvas', () => {
    const context = createContext();
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(context);
    const renderer = new CanvasRenderer(canvas);
    const state: VisualState = {
      elements: [
        { id: 'body', kind: 'path', layer: 1, opacity: 1, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, fill: '#3366ff', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 0 }], closed: true },
        { id: 'label', kind: 'text', layer: 2, opacity: 1, position: { x: 12, y: 18 }, scale: { x: 1, y: 1 }, rotation: 0, fill: '#ffffff', text: 'AI off', fontSize: 14 },
      ],
    };

    renderer.draw(state);

    expect(context.clearRect).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalledTimes(2);
    expect(context.fillText).toHaveBeenCalledWith('AI off', 0, 0);
  });
});
