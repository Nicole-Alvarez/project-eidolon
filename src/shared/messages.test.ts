import { describe, expect, it } from 'vitest';
import { assertExtensionMessage } from './messages';

describe('assertExtensionMessage', () => {
  it('rejects a message with an unknown type', () => {
    expect(() => assertExtensionMessage({ type: 'execute-anything' })).toThrow(
      'Unsupported extension message',
    );
  });
});
