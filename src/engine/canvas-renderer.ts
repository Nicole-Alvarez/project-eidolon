import type { Paint, Point, VisualElement, VisualState } from './types';

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private sceneScale = 1;
  private readonly resizeObserver?: ResizeObserver;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.context = context;
    this.resize();
    this.resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => this.resize())
      : undefined;
    this.resizeObserver?.observe(canvas);
  }

  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(bounds.width || this.canvas.width || 320));
    this.height = Math.max(1, Math.round(bounds.height || this.canvas.height || 320));
    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.sceneScale = this.width / 300;
    this.canvas.width = this.width * this.pixelRatio;
    this.canvas.height = this.height * this.pixelRatio;
  }

  draw(state: VisualState): void {
    const context = this.context;
    context.setTransform(this.pixelRatio * this.sceneScale, 0, 0, this.pixelRatio * this.sceneScale, 0, 0);
    context.clearRect(0, 0, this.width / this.sceneScale, this.height / this.sceneScale);
    for (const element of [...state.elements].sort((a, b) => a.layer - b.layer)) this.drawElement(element);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.context.clearRect(0, 0, this.width, this.height);
  }

  private drawElement(element: VisualElement): void {
    if (element.opacity <= 0 || element.kind === 'group') return;
    const context = this.context;
    context.save();
    context.translate(element.position.x, element.position.y);
    context.rotate(element.rotation);
    context.scale(element.scale.x, element.scale.y);
    context.globalAlpha = element.opacity;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    applyPaint(context, element.fill, 'fill');
    applyPaint(context, element.stroke, 'stroke');
    context.lineWidth = element.strokeWidth ?? 1;

    if (element.kind === 'circle' || element.kind === 'particle') {
      context.beginPath();
      context.arc(0, 0, element.radius, 0, Math.PI * 2);
      paint(context, element);
    } else if (element.kind === 'rect') {
      context.beginPath();
      context.roundRect(-element.width / 2, -element.height / 2, element.width, element.height, element.cornerRadius ?? 0);
      paint(context, element);
    } else if (element.kind === 'line') {
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(element.to.x, element.to.y);
      context.stroke();
    } else if (element.kind === 'path') {
      drawPath(context, element.points, element.closed);
      paint(context, element);
    } else if (element.kind === 'text') {
      context.font = `${element.fontSize}px ${element.fontFamily ?? 'system-ui'}`;
      context.textAlign = element.align ?? 'center';
      if (element.fill) context.fillText(element.text, 0, 0);
      if (element.stroke) context.strokeText(element.text, 0, 0);
    }
    context.restore();
  }
}

function drawPath(context: CanvasRenderingContext2D, points: Point[], closed: boolean): void {
  if (!points.length) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
  if (closed) context.closePath();
}

function paint(context: CanvasRenderingContext2D, element: VisualElement): void {
  if (element.fill) context.fill();
  if (element.stroke) context.stroke();
}

function applyPaint(context: CanvasRenderingContext2D, paintValue: Paint | undefined, property: 'fill' | 'stroke'): void {
  if (!paintValue) return;
  const value = typeof paintValue === 'string'
    ? paintValue
    : (() => {
      const gradient = context.createRadialGradient(paintValue.focal.x, paintValue.focal.y, 0, paintValue.focal.x, paintValue.focal.y, paintValue.radius);
      gradient.addColorStop(0, paintValue.innerColor);
      gradient.addColorStop(1, paintValue.outerColor);
      return gradient;
    })();
  if (property === 'fill') context.fillStyle = value;
  else context.strokeStyle = value;
}
