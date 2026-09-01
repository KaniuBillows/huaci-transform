import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './storage';

describe('normalizeSettings', () => {
  it('migrates legacy profiles into independent models and combinations', () => {
    const result = normalizeSettings({
      profiles: [
        {
          id: 'legacy-profile',
          name: '旧配置',
          baseUrl: 'https://gateway.example/v1',
          apiKey: 'key',
          translateModel: 'luna',
          explainModel: 'claude',
          models: ['luna', 'claude'],
        },
      ],
      defaultProfileId: 'legacy-profile',
      prices: [
        {
          model: 'luna',
          inputPerMillion: 1,
          outputPerMillion: 2,
          currency: 'USD',
        },
      ],
    });

    const combination = result.combinations[0]!;
    const translate = result.models.find((model) => model.id === combination.translateModelId);
    const explain = result.models.find((model) => model.id === combination.explainModelId);
    expect(translate?.model).toBe('luna');
    expect(translate?.inputPerMillion).toBe(1);
    expect(explain?.model).toBe('claude');
    expect(combination.translateModelId).not.toBe(combination.explainModelId);
    expect(result.defaultCombinationId).toBe('legacy-profile');
    expect(result.settingsVersion).toBe(4);
  });

  it('uses stable IDs when an old profile has no ID', () => {
    const legacy = {
      profiles: [
        {
          name: '无 ID 配置',
          baseUrl: 'https://gateway.example/v1',
          apiKey: 'key',
          translateModel: 'model-a',
          explainModel: 'model-b',
        },
      ],
    };
    const first = normalizeSettings(legacy);
    const second = normalizeSettings(legacy);
    expect(first.combinations[0]?.id).toBe(second.combinations[0]?.id);
    expect(first.models[0]?.id).toBe(second.models[0]?.id);
  });

  it('keeps edited preset fields and appends newly introduced presets', () => {
    const result = normalizeSettings({
      models: [
        {
          id: 'preset:openai:gpt-4o-mini',
          providerId: 'openai',
          providerName: 'OpenAI',
          icon: 'openai',
          preset: true,
          name: 'My GPT',
          model: 'gpt-4o-mini',
          baseUrl: 'https://proxy.example/v1',
          apiKey: 'key',
          enabled: true,
          inputPerMillion: 9,
          outputPerMillion: 10,
          currency: 'USD',
        },
      ],
      combinations: [
        {
          id: 'combo',
          name: '组合',
          translateModelId: 'preset:openai:gpt-4o-mini',
          explainModelId: 'preset:openai:gpt-4o-mini',
        },
      ],
      defaultCombinationId: 'combo',
    });

    const edited = result.models.find((model) => model.id === 'preset:openai:gpt-4o-mini');
    expect(edited?.preset).toBe(false);
    expect(edited?.baseUrl).toBe('https://proxy.example/v1');
    expect(edited?.inputPerMillion).toBe(9);
    expect(result.models.some((model) => model.providerId === 'anthropic')).toBe(true);
    expect(result.models.some((model) => model.model === 'gpt-5.4-nano')).toBe(true);
  });
});
