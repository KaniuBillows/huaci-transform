import { createDefaultSettings, SETTINGS_VERSION } from './defaults';
import { createPresetModels } from './providers';
import type {
  AppSettings,
  Currency,
  ModelCombination,
  ModelConfig,
  UsageRecord,
} from './types';

const SETTINGS_KEY = 'transform.settings';
const USAGE_KEY = 'transform.usage';

interface LegacyPrice {
  model?: string;
  inputPerMillion?: number;
  outputPerMillion?: number;
  currency?: Currency;
}

interface LegacyProfile {
  id?: string;
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  translateModel?: string;
  explainModel?: string;
  models?: string[];
}

interface LegacySettings {
  profiles?: LegacyProfile[];
  defaultProfileId?: string;
  prices?: LegacyPrice[];
}

function asModel(raw: ModelConfig): ModelConfig {
  return {
    ...raw,
    enabled: raw.enabled === true,
    preset: raw.preset === true,
    inputPerMillion: Number(raw.inputPerMillion) || 0,
    outputPerMillion: Number(raw.outputPerMillion) || 0,
    cacheInputPerMillion: Number(raw.cacheInputPerMillion) || 0,
    currency: raw.currency === 'CNY' ? 'CNY' : 'USD',
  };
}

function mergePresetModels(saved: ModelConfig[]): ModelConfig[] {
  const catalog = createPresetModels();
  const catalogIDs = new Set(catalog.map((model) => model.id));
  const result: ModelConfig[] = [];
  for (const model of saved.map(asModel)) {
    if (model.preset && !catalogIDs.has(model.id)) {
      if (model.enabled || model.apiKey.trim() !== '') {
        result.push({ ...model, preset: false });
      }
      continue;
    }
    result.push(model);
  }
  const ids = new Set(result.map((model) => model.id));
  for (const preset of catalog) {
    if (!ids.has(preset.id)) {
      result.push(preset);
    }
  }
  return result;
}

function legacyPrice(
  prices: LegacyPrice[],
  modelName: string,
): Pick<ModelConfig, 'inputPerMillion' | 'outputPerMillion' | 'currency'> {
  const price = prices.find((item) => item.model === modelName);
  return {
    inputPerMillion: Number(price?.inputPerMillion) || 0,
    outputPerMillion: Number(price?.outputPerMillion) || 0,
    currency: price?.currency === 'USD' ? 'USD' : 'CNY',
  };
}

function migrateLegacyModel(
  profile: LegacyProfile,
  profileID: string,
  modelName: string,
  prices: LegacyPrice[],
): ModelConfig {
  return {
    id: `legacy:${profileID}:${encodeURIComponent(modelName)}`,
    providerId: `legacy:${profileID}`,
    providerName: profile.name || '旧版配置',
    icon: 'custom',
    preset: false,
    name: modelName,
    model: modelName,
    baseUrl: profile.baseUrl || '',
    apiKey: profile.apiKey || '',
    enabled: Boolean(profile.apiKey && profile.baseUrl && modelName),
    ...legacyPrice(prices, modelName),
    cacheInputPerMillion: 0,
  };
}

function migrateLegacy(value: LegacySettings, fallback: AppSettings): AppSettings {
  const profiles = Array.isArray(value.profiles) ? value.profiles : [];
  const prices = Array.isArray(value.prices) ? value.prices : [];
  const models: ModelConfig[] = [];
  const combinations: ModelCombination[] = [];
  for (const [index, profile] of profiles.entries()) {
    const profileID = profile.id || `profile-${index}`;
    const names = new Set([
      profile.translateModel || '',
      profile.explainModel || '',
      ...(Array.isArray(profile.models) ? profile.models : []),
    ]);
    const byName = new Map<string, ModelConfig>();
    for (const name of names) {
      if (!name.trim()) {
        continue;
      }
      const model = migrateLegacyModel(profile, profileID, name, prices);
      models.push(model);
      byName.set(name, model);
    }
    const translate = byName.get(profile.translateModel || '');
    const explain = byName.get(profile.explainModel || '') ?? translate;
    if (translate && explain) {
      combinations.push({
        id: profileID,
        name: profile.name || '迁移配置',
        translateModelId: translate.id,
        explainModelId: explain.id,
      });
    }
  }
  if (models.length === 0 || combinations.length === 0) {
    return fallback;
  }
  return {
    ...fallback,
    models: mergePresetModels(models),
    combinations,
    defaultCombinationId:
      combinations.find((item) => item.id === value.defaultProfileId)?.id ??
      combinations[0]?.id ??
      fallback.defaultCombinationId,
  };
}

/** 归一化持久化设置，并将 v0.1 的 profile 结构迁移到独立模型结构。 */
export function normalizeSettings(raw: unknown): AppSettings {
  const fallback = createDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const value = raw as Partial<AppSettings>;
  if (!Array.isArray(value.models) || !Array.isArray(value.combinations)) {
    return migrateLegacy(raw as LegacySettings, fallback);
  }
  const models = mergePresetModels(value.models);
  const combinations = value.combinations;
  const first = combinations[0];
  const defaultCombinationId = combinations.some(
    (item) => item.id === value.defaultCombinationId,
  )
    ? value.defaultCombinationId!
    : first?.id ?? fallback.defaultCombinationId;
  return {
    settingsVersion: SETTINGS_VERSION,
    models,
    combinations: combinations.length > 0 ? combinations : fallback.combinations,
    defaultCombinationId,
    streamEnabled: value.streamEnabled !== false,
    typewriterEnabled:
      value.streamEnabled === false ? false : value.typewriterEnabled !== false,
    thinkingEnabled: value.thinkingEnabled === true,
    thinkingExpandedByDefault: value.thinkingExpandedByDefault === true,
    translatePrompt: value.translatePrompt || fallback.translatePrompt,
    explainPrompt: value.explainPrompt || fallback.explainPrompt,
  };
}

/**
 * 读取插件设置。
 */
export async function loadSettings(): Promise<AppSettings> {
  const data = await browser.storage.local.get(SETTINGS_KEY);
  const raw = data[SETTINGS_KEY];
  const settings = normalizeSettings(raw);
  const version = (raw as { settingsVersion?: number } | undefined)?.settingsVersion ?? 0;
  if (version < SETTINGS_VERSION) {
    await saveSettings(settings);
  }
  return settings;
}

/**
 * 保存插件设置。
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  await browser.storage.local.set({
    [SETTINGS_KEY]: { ...settings, settingsVersion: SETTINGS_VERSION },
  });
}

/**
 * 读取本地用量记录。
 */
export async function loadUsage(): Promise<UsageRecord[]> {
  const data = await browser.storage.local.get(USAGE_KEY);
  const raw = data[USAGE_KEY];
  return Array.isArray(raw) ? (raw as UsageRecord[]) : [];
}

/**
 * 追加一条用量记录。
 */
export async function appendUsage(record: UsageRecord): Promise<void> {
  const list = await loadUsage();
  list.push(record);
  await browser.storage.local.set({ [USAGE_KEY]: list });
}

/**
 * 清空用量记录。
 */
export async function clearUsage(): Promise<void> {
  await browser.storage.local.set({ [USAGE_KEY]: [] });
}

/**
 * 订阅设置变化。
 */
export function onSettingsChanged(cb: (settings: AppSettings) => void): () => void {
  const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) {
      return;
    }
    cb(normalizeSettings(changes[SETTINGS_KEY].newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
