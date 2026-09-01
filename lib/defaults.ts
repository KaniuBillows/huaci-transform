import { DEFAULT_EXPLAIN_PROMPT, DEFAULT_TRANSLATE_PROMPT } from './prompts';
import type { ApiProfile, AppSettings } from './types';

export function createEmptyProfile(): ApiProfile {
  return {
    id: crypto.randomUUID(),
    name: '默认配置',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    translateModel: 'gpt-4o-mini',
    explainModel: 'gpt-4o-mini',
  };
}

export function createDefaultSettings(): AppSettings {
  const profile = createEmptyProfile();
  return {
    profiles: [profile],
    defaultProfileId: profile.id,
    streamEnabled: true,
    typewriterEnabled: true,
    thinkingEnabled: false,
    translatePrompt: DEFAULT_TRANSLATE_PROMPT,
    explainPrompt: DEFAULT_EXPLAIN_PROMPT,
    prices: [],
  };
}
