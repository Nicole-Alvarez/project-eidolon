import '@testing-library/jest-dom/vitest';

class PointerEventPolyfill extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.isPrimary = init.isPrimary ?? true;
  }
}

if (typeof globalThis.PointerEvent === 'undefined') {
  Object.defineProperty(globalThis, 'PointerEvent', { value: PointerEventPolyfill });
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill });
}
if (typeof Element.prototype.setPointerCapture !== 'function') {
  Element.prototype.setPointerCapture = () => undefined;
}
if (typeof Element.prototype.releasePointerCapture !== 'function') {
  Element.prototype.releasePointerCapture = () => undefined;
}