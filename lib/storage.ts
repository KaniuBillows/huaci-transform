import { createDefaultSettings } from './defaults';
import type { ApiProfile, AppSettings, UsageRecord } from './types';

function asProfile(raw: ApiProfile): ApiProfile {
  return { ...raw, models: Array.isArray(raw.models) ? raw.models : [] };
}

const SETTINGS_KEY = 'transform.settings';
const USAGE_KEY = 'transform.usage';

function asSettings(raw: unknown): AppSettings {
  const fallback = createDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const value = raw as Partial<AppSettings>;
  const profiles = Array.isArray(value.profiles) && value.profiles.length > 0
    ? value.profiles.map(asProfile)
    : fallback.profiles;
  const first = profiles[0] ?? fallback.profiles[0];
  if (!first) {
    return fallback;
  }
  const defaultProfileId =
    profiles.some((p) => p.id === value.defaultProfileId)
      ? value.defaultProfileId!
      : first.id;
  return {
    profiles,
    defaultProfileId,
    streamEnabled: value.streamEnabled !== false,
    typewriterEnabled: value.typewriterEnabled !== false,
    thinkingEnabled: value.thinkingEnabled === true,
    translatePrompt: value.translatePrompt || fallback.translatePrompt,
    explainPrompt: value.explainPrompt || fallback.explainPrompt,
    prices: Array.isArray(value.prices) ? value.prices : [],
  };
}

/**
 * 读取插件设置。
 */
export async function loadSettings(): Promise<AppSettings> {
  const data = await browser.storage.local.get(SETTINGS_KEY);
  return asSettings(data[SETTINGS_KEY]);
}

/**
 * 保存插件设置。
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
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
    cb(asSettings(changes[SETTINGS_KEY].newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
