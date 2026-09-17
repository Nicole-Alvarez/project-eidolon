import { describe, expect, it } from 'vitest';
import { loadOverlayPosition, saveOverlayPosition } from './overlay-position';

describe('overlay position persistence', () => {
  it('round-trips a saved draggable position', async () => {
    const values: Record<string, unknown> = {};
    const storage = {
      get: async (key: string) => ({ [key]: values[key] }),
      set: async (value: Record<string, unknown>) => { Object.assign(values, value); },
    };

    await saveOverlayPosition(storage, { x: 812, y: 520 });

    await expect(loadOverlayPosition(storage)).resolves.toEqual({ x: 812, y: 520 });
  });
});
