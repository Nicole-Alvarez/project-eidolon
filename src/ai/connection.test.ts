import { describe, expect, it } from 'vitest';
import { DemoConnection } from './demo-connection';
import { bunnyFairy } from '../characters/bunny-fairy';

describe('DemoConnection', () => {
  it('returns only an action in the selected character catalog', async () => {
    const response = await new DemoConnection().generateActionResponse({
      prompt: 'please wave hello',
      character: bunnyFairy,
    });

    expect(response).toMatchObject({ reply: expect.any(String) });
    expect(bunnyFairy.actions).toHaveProperty(response.actions[0].action);
  });
});
