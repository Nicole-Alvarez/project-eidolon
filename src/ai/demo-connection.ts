import type { AIConnection, ActionRequest } from './connection';

export class DemoConnection implements AIConnection {
  readonly kind = 'demo' as const;

  async generateActionResponse({ prompt, character }: ActionRequest) {
    const normalizedPrompt = prompt.toLowerCase();
    const action = Object.keys(character.actions).find((candidate) =>
      normalizedPrompt.includes(candidate.replaceAll('_', ' ')),
    ) ?? (Object.hasOwn(character.actions, 'wave') ? 'wave' : 'idle');

    const reply = `Demo action: ${action.replaceAll('_', ' ')}.`;
    return {
      reply,
      actions: [{ action, parameters: action === 'speak' ? { text: reply } : {} }],
    };
  }
}
