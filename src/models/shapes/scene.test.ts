import { describe, expect, it } from 'vitest';
import { shapesIdleStates } from './scene';

describe('Shapes idle states', () => {
  it('uses 2048 matched path points for every geometric morph target', () => {
    for (const state of shapesIdleStates) {
      const body = state.elements.find((element) => element.id === 'body');
      expect(body?.kind === 'path' ? body.points : []).toHaveLength(2048);
    }
  });
});
