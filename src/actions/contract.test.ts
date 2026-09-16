import { describe, expect, it } from 'vitest';
import { parseActionResponse, validateActions } from './contract';
import { bunnyFairy } from '../characters/bunny-fairy';

describe('action contract', () => {
  it('rejects an unknown character action before it reaches the runtime', () => {
    const response = parseActionResponse({
      reply: 'Hi',
      actions: [{ action: 'delete', parameters: {} }],
    });

    expect(() => validateActions(response, bunnyFairy)).toThrow('Unsupported character action: delete');
  });

  it('accepts bounded speech for the active character', () => {
    const response = parseActionResponse({
      reply: 'Hi',
      actions: [{ action: 'speak', parameters: { text: 'Hi' } }],
    });

    expect(validateActions(response, bunnyFairy)).toEqual([
      { action: 'speak', parameters: { text: 'Hi' } },
    ]);
  });

  it('rejects unexpected top-level fields and oversized action batches', () => {
    expect(() => parseActionResponse({ reply: 'Hi', actions: [], extra: true })).toThrow(
      'Invalid action response',
    );
    expect(() => parseActionResponse({ reply: 'Hi', actions: Array.from({ length: 4 }, () => ({ action: 'idle', parameters: {} })) })).toThrow(
      'Invalid action response',
    );
  });
});
