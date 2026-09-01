import { describe, expect, it } from 'vitest';
import { buildChatBody } from './openai';
import type { ModelConfig } from './types';

const model: ModelConfig = {
  id: 'm1',
  providerId: 'openai',
  providerName: 'OpenAI',
  icon: 'openai',
  preset: false,
  name: 'Test',
  model: 'gpt-test',
  baseUrl: 'https://example.com/v1',
  apiKey: 'key',
  enabled: true,
  inputPerMillion: 1,
  outputPerMillion: 2,
  cacheInputPerMillion: 0.1,
  currency: 'USD',
};

describe('buildChatBody', () => {
  it('始终携带 enable_thinking，关闭时为 false', () => {
    const body = buildChatBody({
      model,
      userPrompt: 'hi',
      stream: true,
      thinking: false,
    });
    expect(body.enable_thinking).toBe(false);
    expect(body.stream).toBe(true);
  });

  it('开启深度思考时 enable_thinking 为 true', () => {
    const body = buildChatBody({
      model,
      userPrompt: 'hi',
      stream: false,
      thinking: true,
    });
    expect(body.enable_thinking).toBe(true);
  });
});
