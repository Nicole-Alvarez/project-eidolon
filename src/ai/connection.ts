import type { CharacterDefinition } from '../characters/types';

export type ConnectionKind = 'demo' | 'openai-api-key' | 'openai-account' | 'codex-account';

export type ActionRequest = {
  prompt: string;
  character: CharacterDefinition;
};

export type ConnectionUnavailable = { code: 'notConfigured' };

export interface AIConnection {
  readonly kind: ConnectionKind;
  generateActionResponse(request: ActionRequest): Promise<unknown>;
}
