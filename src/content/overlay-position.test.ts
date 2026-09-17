import { describe, expect, it } from 'vitest';
import { loadOverlayPosition, loadOverlayResize, loadOverlaySize, saveOverlayPosition, saveOverlayResize, saveOverlaySize } from './overlay-position';

function memoryStorage(values: Record<string, unknown> = {}): { get: (key: string) => Promise<Record<string, unknown>>; set: (value: Record<string, unknown>) => Promise<void> } {
  return {
    get: async (key: string) => ({ [key]: values[key] }),
    set: async (value: Record<string, unknown>) => { Object.assign(values, value); },
  };
}

describe('overlay position persistence', () => {
  it('round-trips a saved draggable position', async () => {
    const storage = memoryStorage();

    await saveOverlayPosition(storage, { x: 812, y: 520 });

    await expect(loadOverlayPosition(storage)).resolves.toEqual({ x: 812, y: 520 });
  });
});

describe('overlay size persistence', () => {
  it('round-trips a saved resize size', async () => {
    const storage = memoryStorage();

    await saveOverlaySize(storage, 460);

    await expect(loadOverlaySize(storage)).resolves.toBe(460);
  });

  it('clamps out-of-range stored sizes', async () => {
    const storage = memoryStorage({ 'eidolon.canvasOverlay.size': 9999 });

    await expect(loadOverlaySize(storage)).resolves.toBe(640);
  });
});

describe('overlay resize toggle persistence', () => {
  it('round-trips the resize tool on/off state', async () => {
    const storage = memoryStorage();

    await saveOverlayResize(storage, true);

    await expect(loadOverlayResize(storage)).resolves.toBe(true);
  });

  it('ignores non-boolean stored values', async () => {
    const storage = memoryStorage({ 'eidolon.canvasOverlay.resize': 'yes' });

    await expect(loadOverlayResize(storage)).resolves.toBeUndefined();
  });
});
