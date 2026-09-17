import type { GradientPaint, Paint, Point, VisualElement, VisualState } from './types';

export function interpolateState(from: VisualState, to: VisualState, progress: number): VisualState {
  const amount = clamp(progress);
  const destination = new Map(to.elements.map((element) => [key(element), element]));
  const elements: VisualElement[] = [];

  for (const source of from.elements) {
    const target = destination.get(key(source));
    if (target) {
      elements.push(interpolateElement(source, target, amount));
      destination.delete(key(source));
    } else {
      elements.push({ ...source, opacity: source.opacity * (1 - amount) });
    }
  }

  for (const target of destination.values()) {
    elements.push({ ...target, opacity: target.opacity * amount });
  }

  return { elements };
}

function interpolateElement(source: VisualElement, target: VisualElement, amount: number): VisualElement {
  const common = {
    ...source,
    opacity: mix(source.opacity, target.opacity, amount),
    position: mixPoint(source.position, target.position, amount),
    scale: mixPoint(source.scale, target.scale, amount),
    rotation: mix(source.rotation, target.rotation, amount),
    fill: mixPaint(source.fill, target.fill, amount),
    stroke: mixPaint(source.stroke, target.stroke, amount),
    strokeWidth: mixOptionalNumber(source.strokeWidth, target.strokeWidth, amount),
  };

  if (source.kind === 'path' && target.kind === 'path') {
    return source.points.length === target.points.length
      ? { ...common, kind: 'path', points: source.points.map((point, index) => mixPoint(point, target.points[index], amount)), closed: target.closed }
      : amount < 1 ? source : target;
  }
  if ((source.kind === 'circle' || source.kind === 'particle') && source.kind === target.kind) {
    return { ...common, kind: source.kind, radius: mix(source.radius, target.radius, amount) };
  }
  if (source.kind === 'rect' && target.kind === 'rect') {
    return { ...common, kind: 'rect', width: mix(source.width, target.width, amount), height: mix(source.height, target.height, amount), cornerRadius: mixOptionalNumber(source.cornerRadius, target.cornerRadius, amount) };
  }
  if (source.kind === 'line' && target.kind === 'line') return { ...common, kind: 'line', to: mixPoint(source.to, target.to, amount) };
  if (source.kind === 'text' && target.kind === 'text') return { ...common, kind: 'text', text: amount < 1 ? source.text : target.text, fontSize: mix(source.fontSize, target.fontSize, amount), fontFamily: target.fontFamily, align: target.align };
  if (source.kind === 'group' && target.kind === 'group') return { ...common, kind: 'group', children: target.children };
  return amount < 1 ? source : target;
}

function key(element: VisualElement): string {
  return `${element.kind}:${element.id}`;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function mixOptionalNumber(from: number | undefined, to: number | undefined, amount: number): number | undefined {
  if (from === undefined || to === undefined) return amount < 1 ? from : to;
  return mix(from, to, amount);
}

function mixPoint(from: Point, to: Point, amount: number): Point {
  return { x: mix(from.x, to.x, amount), y: mix(from.y, to.y, amount) };
}

function mixPaint(from: Paint | undefined, to: Paint | undefined, amount: number): Paint | undefined {
  if (amount <= 0) return from;
  if (amount >= 1) return to;
  if (!from || !to) return amount < 1 ? from : to;
  if (typeof from !== 'string' || typeof to !== 'string') {
    if (isGradient(from) && isGradient(to)) {
      return {
        type: 'radial-gradient',
        innerColor: mixColor(from.innerColor, to.innerColor, amount) ?? from.innerColor,
        outerColor: mixColor(from.outerColor, to.outerColor, amount) ?? from.outerColor,
        focal: mixPoint(from.focal, to.focal, amount),
        radius: mix(from.radius, to.radius, amount),
      };
    }
    return amount < 0.5 ? from : to;
  }
  return mixColor(from, to, amount);
}

function mixColor(from: string, to: string, amount: number): string | undefined {
  const start = hexColor(from);
  const end = hexColor(to);
  if (!start || !end) return amount < 0.5 ? from : to;
  return `rgba(${Math.round(mix(start[0], end[0], amount))}, ${Math.round(mix(start[1], end[1], amount))}, ${Math.round(mix(start[2], end[2], amount))}, ${mix(start[3], end[3], amount)})`;
}

function isGradient(value: Paint): value is GradientPaint {
  return typeof value !== 'string' && value.type === 'radial-gradient';
}

function hexColor(value: string): [number, number, number, number] | undefined {
  const digits = value.startsWith('#') ? value.slice(1) : '';
  if (!/^[\da-f]{3,8}$/i.test(digits)) return undefined;
  const expanded = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join('') : digits;
  if (expanded.length !== 6 && expanded.length !== 8) return undefined;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
    expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  ];
}
