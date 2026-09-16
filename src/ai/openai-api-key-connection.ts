import { parseActionResponse } from '../actions/contract';
import type { AIConnection, ActionRequest } from './connection';

type FetchLike = typeof fetch;

export class OpenAIApiKeyConnection implements AIConnection {
  readonly kind = 'openai-api-key' as const;

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly model = 'gpt-4.1-mini',
  ) {}

  async generateActionResponse(request: ActionRequest) {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error('OpenAI API key is not configured');

    let response: Response;
    try {
      response = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody(request, this.model)),
      });
    } catch {
      throw new Error('Provider request failed');
    }
    if (!response.ok) throw new Error('Provider request failed');

    const payload: unknown = await response.json();
    if (!isRecord(payload) || typeof payload.output_text !== 'string') {
      throw new Error('Provider request failed');
    }
    return parseActionResponse(payload.output_text);
  }
}

function createRequestBody(request: ActionRequest, model: string) {
  const actionNames = Object.keys(request.character.actions);
  const nonSpeechActions = actionNames.filter((action) => action !== 'speak');
  return {
    model,
    store: false,
    input: request.prompt,
    instructions: `Return an action for ${request.character.name}. Select only supported actions.`,
    text: {
      format: {
        type: 'json_schema',
        name: 'character_action',
        strict: true,
        schema: {
          type: 'object', additionalProperties: false, required: ['reply', 'actions'],
          properties: {
            reply: { type: 'string', maxLength: 280 },
            actions: {
              type: 'array', maxItems: 3,
              items: {
                oneOf: [
                  {
                    type: 'object', additionalProperties: false, required: ['action', 'parameters'],
                    properties: { action: { type: 'string', enum: nonSpeechActions }, parameters: { type: 'object', additionalProperties: false } },
                  },
                  {
                    type: 'object', additionalProperties: false, required: ['action', 'parameters'],
                    properties: { action: { const: 'speak' }, parameters: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string', maxLength: 280 } } } },
                  },
                ],
              },
            },
          },
        },
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
