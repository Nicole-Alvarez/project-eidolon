export const introDurationMs = 480;
export const outroDurationMs = 240;
export const outroFallbackMs = 360;

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function waitForExit(element: Element, fallbackMs = outroFallbackMs): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      element.removeEventListener('animationend', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, fallbackMs);
    element.addEventListener('animationend', finish);
  });
}
