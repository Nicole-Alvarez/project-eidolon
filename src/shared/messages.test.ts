import { describe, expect, it } from 'vitest';
import { assertExtensionMessage } from './messages';

describe('assertExtensionMessage', () => {
  it('rejects the retired demo-action message', () => {
    expect(() => assertExtensionMessage({ type: 'action/run-demo', tabId: 7, prompt: 'think' })).toThrow(
      'Unsupported extension message',
    );
  });

  it('rejects a message with an unknown type', () => {
    expect(() => assertExtensionMessage({ type: 'execute-anything' })).toThrow(
      'Unsupported extension message',
    );
  });

  it('accepts an overlay status probe', () => {
    expect(assertExtensionMessage({ type: 'overlay/status', tabId: 3 })).toEqual({ type: 'overlay/status', tabId: 3 });
  });
});
