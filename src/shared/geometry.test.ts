import { describe, expect, it } from 'vitest';
import { sampleCircle, sampleClosedSpline } from './geometry';
import type { Point } from '../engine/types';

describe('sampleClosedSpline', () => {
  it('samples exactly count points', () => {
    const targets: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 20 }, { x: 90, y: 110 }, { x: 10, y: 90 }];
    expect(sampleClosedSpline(targets, 2048)).toHaveLength(2048);
  });

  it('passes through every control point on a closed loop', () => {
    const targets: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 20 }, { x: 90, y: 110 }, { x: 10, y: 90 }];
    const sampled = sampleClosedSpline(targets, 2048);
    targets.forEach((target, index) => {
      const point = sampled[Math.round(index * 2048 / targets.length)];
      expect(point.x).toBeCloseTo(target.x, 6);
      expect(point.y).toBeCloseTo(target.y, 6);
    });
  });

  it('keeps every state topology identical', () => {
    const targets: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 20 }, { x: 90, y: 110 }, { x: 10, y: 90 }];
    for (const offset of [1, 25, 50]) {
      const shifted = targets.map((point) => ({ x: point.x + offset, y: point.y - offset }));
      expect(sampleClosedSpline(shifted, 2048)).toHaveLength(sampleClosedSpline(targets, 2048).length);
    }
  });
});

describe('sampleCircle', () => {
  it('samples exactly count points at the requested radius', () => {
    const points = sampleCircle(105, 2048, { x: 150, y: 150 });
    expect(points).toHaveLength(2048);
    for (const point of points) {
      const distance = Math.hypot(point.x - 150, point.y - 150);
      expect(distance).toBeCloseTo(105, 6);
    }
  });

  it('wraps seamlessly without a duplicated seam point', () => {
    const points = sampleCircle(60, 512);
    expect(points[0]).not.toEqual(points[points.length - 1]);
  });
});