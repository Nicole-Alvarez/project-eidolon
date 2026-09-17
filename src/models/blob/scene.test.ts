import { describe, expect, it } from 'vitest';
import { blobScenes } from './scene';
import type { Point, PathElement } from '../../engine/types';

describe('Blob idle states', () => {
  it('smooths every body into a continuous curve with 2048 points', () => {
    for (const [name, scene] of Object.entries({ idle: blobScenes.idle, think: blobScenes.think, listen: blobScenes.listen, search: blobScenes.search, happy: blobScenes.happy, sleep: blobScenes.sleep })) {
      const body = scene.elements.find((element) => element.id === 'body') as PathElement;
      expect(body.points).toHaveLength(2048);
      const degrees = maxTurnDegrees(body.points);
      expect(degrees, `${name} body still has hard corners`).toBeLessThan(2);
    }
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