import { describe, expect, it } from 'vitest';
import { bunnyFairy } from './bunny-fairy';

describe('Bunny Fairy catalog', () => {
  it('maps public actions without exposing raw model parameter IDs', () => {
    expect(bunnyFairy.actions.blush).toMatchObject({
      kind: 'expression',
      file: 'expressions/Blush.exp3.json',
    });
    expect(bunnyFairy.actions.wave).toMatchObject({ kind: 'procedural', name: 'wave' });
    expect(bunnyFairy.actions).not.toHaveProperty('ParamMouthOpenY');
  });
});
