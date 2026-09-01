import { describe, expect, it } from 'vitest';
import {
  defaultCombination,
  enabledModels,
  isCombinationReady,
  modelForTask,
  validateModel,
} from './model_config';
import type { AppSettings, ModelConfig } from './types';

function model(patch: Partial<ModelConfig> = {}): ModelConfig {
  return {
    id: 'm1',
    providerId: 'openai',
    providerName: 'OpenAI',
    icon: 'openai',
    preset: false,
    name: 'Luna',
    model: 'luna',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'key',
    enabled: true,
    inputPerMillion: 1,
    outputPerMillion: 2,
    cacheInputPerMillion: 0.1,
    currency: 'USD',
    ...patch,
  };
}

function settings(): AppSettings {
  return {
    settingsVersion: 4,
    models: [model(), model({ id: 'm2', providerName: 'Anthropic', name: 'Claude' })],
    combinations: [
      {
        id: 'c1',
        name: '混合配置',
        translateModelId: 'm1',
        explainModelId: 'm2',
      },
    ],
    defaultCombinationId: 'c1',
    streamEnabled: true,
    typewriterEnabled: true,
    thinkingEnabled: false,
    thinkingExpandedByDefault: false,
    translatePrompt: '',
    explainPrompt: '',
  };
}

describe('validateModel', () => {
  it('requires endpoint and credentials before enabling', () => {
    expect(validateModel(model({ apiKey: '', baseUrl: '' }))).toEqual([
      'Base URL',
      'API Key',
    ]);
  });
});

describe('model configuration', () => {
  it('combines translation and explanation models independently', () => {
    const app = settings();
    const combination = defaultCombination(app)!;
    expect(modelForTask(app, combination, 'translate')?.name).toBe('Luna');
    expect(modelForTask(app, combination, 'explain')?.name).toBe('Claude');
    expect(isCombinationReady(app, combination)).toBe(true);
  });

  it('excludes disabled models', () => {
    const app = settings();
    app.models[1] = model({ id: 'm2', enabled: false });
    expect(enabledModels(app)).toHaveLength(1);
    expect(isCombinationReady(app, app.combinations[0]!)).toBe(false);
  });
});
