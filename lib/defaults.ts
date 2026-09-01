import { DEFAULT_EXPLAIN_PROMPT, DEFAULT_TRANSLATE_PROMPT } from './prompts';
import { createPresetModels } from './providers';
import type { AppSettings, ModelCombination } from './types';

/** 当前持久化设置版本。 */
export const SETTINGS_VERSION = 4;

/** 创建默认的翻译/解释组合。 */
export function createEmptyCombination(
  translateModelId = 'preset:openai:gpt-5.6-luna',
  explainModelId = 'preset:anthropic:claude-sonnet-5',
): ModelCombination {
  return {
    id: crypto.randomUUID(),
    name: '默认配置',
    translateModelId,
    explainModelId,
  };
}

export function createDefaultSettings(): AppSettings {
  const combination = createEmptyCombination();
  return {
    settingsVersion: SETTINGS_VERSION,
    models: createPresetModels(),
    combinations: [combination],
    defaultCombinationId: combination.id,
    streamEnabled: true,
    typewriterEnabled: true,
    thinkingEnabled: false,
    thinkingExpandedByDefault: false,
    translatePrompt: DEFAULT_TRANSLATE_PROMPT,
    explainPrompt: DEFAULT_EXPLAIN_PROMPT,
  };
}
