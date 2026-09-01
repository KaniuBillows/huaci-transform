import type { Currency, ModelConfig } from './types';

/** 预置厂商元信息。 */
export interface ProviderPreset {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;
}

interface ModelPreset {
  providerId: string;
  name: string;
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
  cacheInputPerMillion: number;
  currency: Currency;
}

/** 内置厂商。均使用 OpenAI 兼容 Chat Completions 入口。 */
export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'openai',
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  {
    id: 'alibaba',
    name: '阿里',
    icon: 'alibaba',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  {
    id: 'doubao',
    name: '豆包',
    icon: 'doubao',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  {
    id: 'glm',
    name: 'GLM',
    icon: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    icon: 'minimax',
    baseUrl: 'https://api.minimax.chat/v1',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    icon: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: 'xai',
    baseUrl: 'https://api.x.ai/v1',
  },
];

const PRESETS: ModelPreset[] = [
  // OpenAI：5.6 系列 + 5.4 nano（取代 GPT-4 小模型）
  {
    providerId: 'openai',
    name: 'GPT-5.6 Luna',
    model: 'gpt-5.6-luna',
    inputPerMillion: 0.2,
    outputPerMillion: 1.2,
    cacheInputPerMillion: 0.02,
    currency: 'USD',
  },
  {
    providerId: 'openai',
    name: 'GPT-5.6 Terra',
    model: 'gpt-5.6-terra',
    inputPerMillion: 2,
    outputPerMillion: 12,
    cacheInputPerMillion: 0.2,
    currency: 'USD',
  },
  {
    providerId: 'openai',
    name: 'GPT-5.6 Sol',
    model: 'gpt-5.6-sol',
    inputPerMillion: 4,
    outputPerMillion: 20,
    cacheInputPerMillion: 0.4,
    currency: 'USD',
  },
  {
    providerId: 'openai',
    name: 'GPT-5.4 Nano',
    model: 'gpt-5.4-nano',
    inputPerMillion: 0.2,
    outputPerMillion: 1.25,
    cacheInputPerMillion: 0.02,
    currency: 'USD',
  },
  {
    providerId: 'openai',
    name: 'GPT-5.4 Mini',
    model: 'gpt-5.4-mini',
    inputPerMillion: 0.75,
    outputPerMillion: 4.5,
    cacheInputPerMillion: 0.075,
    currency: 'USD',
  },

  // Anthropic：5 系列 + Haiku 小模型
  {
    providerId: 'anthropic',
    name: 'Claude Opus 5',
    model: 'claude-opus-5',
    inputPerMillion: 5,
    outputPerMillion: 25,
    cacheInputPerMillion: 0.5,
    currency: 'USD',
  },
  {
    providerId: 'anthropic',
    name: 'Claude Sonnet 5',
    model: 'claude-sonnet-5',
    inputPerMillion: 2,
    outputPerMillion: 10,
    cacheInputPerMillion: 0.2,
    currency: 'USD',
  },
  {
    providerId: 'anthropic',
    name: 'Claude Haiku 4.5',
    model: 'claude-haiku-4-5',
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheInputPerMillion: 0.1,
    currency: 'USD',
  },

  // Google：只要 3 系列（3.7 / 3.6 Flash + 3.1 Pro）
  {
    providerId: 'google',
    name: 'Gemini 3.7 Flash',
    model: 'gemini-3.7-flash',
    inputPerMillion: 0.75,
    outputPerMillion: 3.75,
    cacheInputPerMillion: 0.075,
    currency: 'USD',
  },
  {
    providerId: 'google',
    name: 'Gemini 3.6 Flash',
    model: 'gemini-3.6-flash',
    inputPerMillion: 1.5,
    outputPerMillion: 7.5,
    cacheInputPerMillion: 0.15,
    currency: 'USD',
  },
  {
    providerId: 'google',
    name: 'Gemini 3.1 Pro',
    model: 'gemini-3.1-pro-preview',
    inputPerMillion: 2,
    outputPerMillion: 12,
    cacheInputPerMillion: 0.2,
    currency: 'USD',
  },

  // DeepSeek：只要 V4 系列
  {
    providerId: 'deepseek',
    name: 'DeepSeek V4 Flash',
    model: 'deepseek-v4-flash',
    inputPerMillion: 0.14,
    outputPerMillion: 0.28,
    cacheInputPerMillion: 0.0028,
    currency: 'USD',
  },
  {
    providerId: 'deepseek',
    name: 'DeepSeek V4 Pro',
    model: 'deepseek-v4-pro',
    inputPerMillion: 0.435,
    outputPerMillion: 0.87,
    cacheInputPerMillion: 0.003625,
    currency: 'USD',
  },

  // 阿里
  {
    providerId: 'alibaba',
    name: 'Qwen Plus',
    model: 'qwen-plus',
    inputPerMillion: 0.8,
    outputPerMillion: 2,
    cacheInputPerMillion: 0.16,
    currency: 'CNY',
  },
  {
    providerId: 'alibaba',
    name: 'Qwen Turbo',
    model: 'qwen-turbo',
    inputPerMillion: 0.3,
    outputPerMillion: 0.6,
    cacheInputPerMillion: 0.06,
    currency: 'CNY',
  },
  {
    providerId: 'alibaba',
    name: 'Qwen Max',
    model: 'qwen-max',
    inputPerMillion: 2.4,
    outputPerMillion: 9.6,
    cacheInputPerMillion: 0.48,
    currency: 'CNY',
  },

  // 豆包 Seed 2.0
  {
    providerId: 'doubao',
    name: 'Seed 2.0 Mini',
    model: 'doubao-seed-2-0-mini-260215',
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
    cacheInputPerMillion: 0.06,
    currency: 'CNY',
  },
  {
    providerId: 'doubao',
    name: 'Seed 2.0 Lite',
    model: 'doubao-seed-2-0-lite-260215',
    inputPerMillion: 0.8,
    outputPerMillion: 2.4,
    cacheInputPerMillion: 0.16,
    currency: 'CNY',
  },
  {
    providerId: 'doubao',
    name: 'Seed 2.0 Pro',
    model: 'doubao-seed-2-0-pro-260215',
    inputPerMillion: 3.2,
    outputPerMillion: 16,
    cacheInputPerMillion: 0.64,
    currency: 'CNY',
  },

  // GLM：只要 5 系列
  {
    providerId: 'glm',
    name: 'GLM-5.3 Flash',
    model: 'glm-5.3-flash',
    inputPerMillion: 0.15,
    outputPerMillion: 0.5,
    cacheInputPerMillion: 0.015,
    currency: 'USD',
  },
  {
    providerId: 'glm',
    name: 'GLM-5.3',
    model: 'glm-5.3',
    inputPerMillion: 1.4,
    outputPerMillion: 4.4,
    cacheInputPerMillion: 0.26,
    currency: 'USD',
  },
  {
    providerId: 'glm',
    name: 'GLM-5',
    model: 'glm-5',
    inputPerMillion: 1.4,
    outputPerMillion: 4.4,
    cacheInputPerMillion: 0.26,
    currency: 'USD',
  },

  // MiniMax
  {
    providerId: 'minimax',
    name: 'MiniMax M3',
    model: 'MiniMax-M3',
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
    cacheInputPerMillion: 0.03,
    currency: 'USD',
  },
  {
    providerId: 'minimax',
    name: 'MiniMax M2.5',
    model: 'MiniMax-M2.5',
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
    cacheInputPerMillion: 0.03,
    currency: 'USD',
  },

  // Kimi
  {
    providerId: 'kimi',
    name: 'Kimi K2.7',
    model: 'kimi-k2.7',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheInputPerMillion: 0.3,
    currency: 'CNY',
  },
  {
    providerId: 'kimi',
    name: 'Kimi K2.5',
    model: 'kimi-k2.5',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheInputPerMillion: 0.3,
    currency: 'CNY',
  },

  // xAI
  {
    providerId: 'xai',
    name: 'Grok 4.6',
    model: 'grok-4.6',
    inputPerMillion: 2,
    outputPerMillion: 6,
    cacheInputPerMillion: 0.5,
    currency: 'USD',
  },
  {
    providerId: 'xai',
    name: 'Grok 4.5',
    model: 'grok-4.5',
    inputPerMillion: 2,
    outputPerMillion: 6,
    cacheInputPerMillion: 0.3,
    currency: 'USD',
  },
];

function providerByID(providerId: string): ProviderPreset | undefined {
  return PROVIDERS.find((provider) => provider.id === providerId);
}

function presetID(preset: ModelPreset): string {
  return `preset:${preset.providerId}:${preset.model}`;
}

/** 创建全部内置模型；默认关闭，避免未填 Key 时产生无效请求。 */
export function createPresetModels(): ModelConfig[] {
  return PRESETS.map((preset) => {
    const provider = providerByID(preset.providerId);
    if (!provider) {
      throw new Error(`未知内置厂商: ${preset.providerId}`);
    }
    return {
      id: presetID(preset),
      providerId: provider.id,
      providerName: provider.name,
      icon: provider.icon,
      preset: true,
      name: preset.name,
      model: preset.model,
      baseUrl: provider.baseUrl,
      apiKey: '',
      enabled: false,
      inputPerMillion: preset.inputPerMillion,
      outputPerMillion: preset.outputPerMillion,
      cacheInputPerMillion: preset.cacheInputPerMillion,
      currency: preset.currency,
    };
  });
}

/** 在指定厂商下创建自定义模型。 */
export function createCustomModel(provider?: ProviderPreset): ModelConfig {
  return {
    id: crypto.randomUUID(),
    providerId: provider?.id ?? `custom:${crypto.randomUUID()}`,
    providerName: provider?.name ?? '自定义厂商',
    icon: provider?.icon ?? 'custom',
    preset: false,
    name: '自定义模型',
    model: '',
    baseUrl: provider?.baseUrl ?? '',
    apiKey: '',
    enabled: false,
    inputPerMillion: 0,
    outputPerMillion: 0,
    cacheInputPerMillion: 0,
    currency: 'USD',
  };
}

/** 判断厂商是否为内置厂商，用于选择品牌图标。 */
export function isPresetProvider(providerId: string): boolean {
  return PROVIDERS.some((provider) => provider.id === providerId);
}
