import { describe, expect, it } from 'vitest';
import { interpolateState } from './interpolate';
import type { VisualState } from './types';

const path = (id: string, opacity: number, pointX: number): VisualState['elements'][number] => ({
  id,
  kind: 'path',
  layer: 1,
  opacity,
  position: { x: 10, y: 20 },
  scale: { x: 1, y: 1 },
  rotation: 0,
  fill: '#2244ff',
  points: [{ x: pointX, y: 10 }, { x: pointX + 10, y: 20 }, { x: pointX + 20, y: 10 }],
  closed: true,
});

describe('interpolateState', () => {
  it('interpolates stable path control points and properties', () => {
    const from: VisualState = { elements: [{ ...path('body', 0.5, 0), position: { x: 0, y: 20 } }] };
    const to: VisualState = { elements: [{ ...path('body', 1, 10), position: { x: 100, y: 60 } }] };

    const result = interpolateState(from, to, 0.5).elements[0];
    expect(result).toMatchObject({
      id: 'body',
      opacity: 0.75,
      position: { x: 50, y: 40 },
    });
    expect(result.kind === 'path' ? result.points[0] : undefined).toEqual({ x: 5, y: 10 });
  });

  it('softly exits source-only elements and enters destination-only elements', () => {
    const from: VisualState = { elements: [path('old-orbit', 1, 0)] };
    const to: VisualState = { elements: [path('new-spark', 1, 20)] };

    expect(interpolateState(from, to, 0.5).elements.map(({ id, opacity }) => ({ id, opacity }))).toEqual([
      { id: 'old-orbit', opacity: 0.5 },
      { id: 'new-spark', opacity: 0.5 },
    ]);
  });
});
