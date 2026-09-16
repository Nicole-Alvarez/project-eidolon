import type { CharacterDefinition } from '../characters/types';

export type ParsedAction = { action: string; parameters: Record<string, unknown> };

export type ParsedActionResponse = {
  reply: string;
  actions: readonly ParsedAction[];
};

export type ValidatedAction = {
  action: string;
  parameters: Readonly<Record<string, string>>;
};

const maxTextLength = 280;
const maxActions = 3;

export function parseActionResponse(input: unknown): ParsedActionResponse {
  const value = typeof input === 'string' ? parseJson(input) : input;
  if (!isRecord(value) || !hasOnlyKeys(value, ['reply', 'actions']) || typeof value.reply !== 'string' || value.reply.length > maxTextLength || !Array.isArray(value.actions) || value.actions.length > maxActions) {
    throw new Error('Invalid action response');
  }

  return Object.freeze({
    reply: value.reply,
    actions: Object.freeze(value.actions.map(parseAction)),
  });
}

export function validateActions(
  response: ParsedActionResponse,
  character: CharacterDefinition,
): ValidatedAction[] {
  return response.actions.map(({ action, parameters }) => {
    if (!Object.hasOwn(character.actions, action)) {
      throw new Error(`Unsupported character action: ${action}`);
    }

    if (action === 'speak') {
      if (!hasOnlyKeys(parameters, ['text']) || typeof parameters.text !== 'string' || parameters.text.length === 0 || parameters.text.length > maxTextLength) {
        throw new Error('Invalid parameters for action: speak');
      }
      return Object.freeze({ action, parameters: Object.freeze({ text: parameters.text }) });
    }

    if (!hasOnlyKeys(parameters, [])) {
      throw new Error(`Invalid parameters for action: ${action}`);
    }
    return Object.freeze({ action, parameters: Object.freeze({}) });
  });
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    throw new Error('Invalid action response');
  }
}

function parseAction(value: unknown): ParsedAction {
  if (!isRecord(value) || !hasOnlyKeys(value, ['action', 'parameters']) || typeof value.action !== 'string' || !isRecord(value.parameters)) {
    throw new Error('Invalid action response');
  }
  return Object.freeze({ action: value.action, parameters: Object.freeze({ ...value.parameters }) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}
