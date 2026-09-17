import { describe, expect, it } from 'vitest';
import { MorphController } from './morph-controller';
import type { VisualState } from './types';

const state = (x: number): VisualState => ({
  elements: [{ id: 'body', kind: 'circle', layer: 1, opacity: 1, position: { x, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, radius: 20, fill: '#000000' }],
});

describe('MorphController', () => {
  it('starts an interrupted transition from the current rendered frame', () => {
    const controller = new MorphController(state(0));
    controller.start(state(100), { durationMs: 300, easing: 'linear' }, 100);
    const halfway = controller.sample(250);

    controller.start(state(200), { durationMs: 300, easing: 'linear' }, 250);

    expect(controller.sample(250)).toEqual(halfway);
  });
});
