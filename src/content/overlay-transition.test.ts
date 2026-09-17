import { describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, waitForExit } from './overlay-transition';

describe('waitForExit', () => {
  it('resolves when the exit animation finishes', async () => {
    const element = document.createElement('div');
    const promise = waitForExit(element, 1000);

    element.dispatchEvent(new Event('animationend'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('falls back to the timeout when no animation event arrives', async () => {
    vi.useFakeTimers();
    try {
      const element = document.createElement('div');
      const promise = waitForExit(element, 500);

      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('prefersReducedMotion', () => {
  it('reads the reduced-motion media query when available', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal('matchMedia', matchMedia);
    try {
      expect(prefersReducedMotion()).toBe(true);
      expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
