import type { Point } from '../engine/types';

export function sampleClosedSpline(targets: Point[], count = 2048): Point[] {
  if (targets.length < 3) return sampleLinear(targets, count);
  const n = targets.length;
  return Array.from({ length: count }, (_, index) => {
    const t = index * n / count;
    const segment = Math.floor(t);
    const u = t - segment;
    const previous = targets[(segment - 1 + n) % n];
    const start = targets[segment % n];
    const end = targets[(segment + 1) % n];
    const next = targets[(segment + 2) % n];
    const u2 = u * u;
    const u3 = u2 * u;
    return {
      x: 0.5 * ((2 * start.x) + (-previous.x + end.x) * u + (2 * previous.x - 5 * start.x + 4 * end.x - next.x) * u2 + (-previous.x + 3 * start.x - 3 * end.x + next.x) * u3),
      y: 0.5 * ((2 * start.y) + (-previous.y + end.y) * u + (2 * previous.y - 5 * start.y + 4 * end.y - next.y) * u2 + (-previous.y + 3 * start.y - 3 * end.y + next.y) * u3),
    };
  });
}

export function sampleCircle(radius: number, count = 2048, center: Point = { x: 0, y: 0 }, rotation = -Math.PI / 2): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = rotation + index * Math.PI * 2 / count;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
}

function sampleLinear(targets: Point[], count: number): Point[] {
  const n = targets.length;
  return Array.from({ length: count }, (_, index) => {
    const t = index * n / count;
    const start = targets[Math.floor(t) % n];
    const end = targets[(Math.floor(t) + 1) % n];
    const amount = t - Math.floor(t);
    return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount };
  });
}