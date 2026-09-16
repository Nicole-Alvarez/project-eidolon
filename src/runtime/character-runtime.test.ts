import { describe, expect, it } from 'vitest';
import { bunnyFairy } from '../characters/bunny-fairy';
import { CharacterRuntime } from './character-runtime';
import type { Live2DRuntime } from './types';

describe('CharacterRuntime', () => {
  it('executes actions serially and restores idle', async () => {
    const events: string[] = [];
    const renderer: Live2DRuntime = {
      load: async () => undefined,
      applyExpression: async (file) => { events.push(`expression:${file}`); },
      runProcedural: async (name, parameters) => { events.push(`${name}:${parameters.text ?? ''}`); },
      dispose: () => undefined,
    };
    const runtime = new CharacterRuntime(renderer);
    await runtime.load(bunnyFairy);
    events.length = 0;
    await runtime.execute([
      { action: 'blush', parameters: {} },
      { action: 'speak', parameters: { text: 'Hi' } },
    ]);

    expect(events).toEqual(['expression:expressions/Blush.exp3.json', 'speak:Hi', 'idle:']);
  });
});
