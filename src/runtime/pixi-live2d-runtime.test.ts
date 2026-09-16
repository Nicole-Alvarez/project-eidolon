import { describe, expect, it } from 'vitest';
import { PixiLive2DRuntime } from './pixi-live2d-runtime';

describe('PixiLive2DRuntime', () => {
  it('reports a setup error when the Cubism Core is unavailable', async () => {
    const canvas = document.createElement('canvas');
    await expect(
      new PixiLive2DRuntime(canvas).load('/characters/bunny-fairy/model/bunny_vts.model3.json'),
    ).rejects.toThrow('Cubism Core is not installed');
  });
});
