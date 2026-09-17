import { describe, expect, it } from 'vitest';
import { shapesIdleStates } from './scene';
import type { Point, PathElement } from '../../engine/types';

describe('Shapes idle states', () => {
  it('uses 2048 matched path points for every geometric morph target', () => {
    for (const state of shapesIdleStates) {
      const body = state.elements.find((element) => element.id === 'body');
      expect(body?.kind === 'path' ? body.points : []).toHaveLength(2048);
    }
  });

  it('rounds only the circle state into a smooth continuous curve', () => {
    const circle = shapesIdleStates[0].elements.find((element) => element.id === 'body') as PathElement;
    expect(circle.points).toHaveLength(2048);
    expect(maxTurnDegrees(circle.points)).toBeLessThan(1);
  });
});

function maxTurnDegrees(points: Point[]): number {
  if (points.length < 3) return 0;
  let max = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[(index - 1 + points.length) % points.length];
    const b = points[index];
    const c = points[(index + 1) % points.length];
    const headingIn = Math.atan2(b.y - a.y, b.x - a.x);
    const headingOut = Math.atan2(c.y - b.y, c.x - b.x);
    let delta = Math.abs(headingOut - headingIn);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    max = Math.max(max, delta * 180 / Math.PI);
  }
  return max;
}
