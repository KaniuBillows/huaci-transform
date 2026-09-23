import { SETTINGS_VERSION } from './defaults';
import { normalizeSettings } from './storage';
import type { AppSettings } from './types';

/** 配置包协议版本。改动导出/导入的封装结构时递增，旧版本仍可导入。 */
export const CONFIG_EXPORT_VERSION = 1;

export const CONFIG_EXPORT_APP = 'huaci-transform';
export const CONFIG_EXPORT_KIND = 'config';

/**
 * 内嵌设置的 schema 版本，导入方据此判断是否需要迁移或升级插件。
 *
 * 只有在设置结构发生变更时才递增（见 `SETTINGS_VERSION`），因此这里可以安全地
 * 与 `SETTINGS_VERSION` 直接比较：数值相等意味着导出方与导入方的设置结构一致。
 */
export const CONFIG_SETTINGS_VERSION = SETTINGS_VERSION;

interface ConfigExportEnvelope {
  app: typeof CONFIG_EXPORT_APP;
  kind: typeof CONFIG_EXPORT_KIND;
  /** 配置包协议版本 */
  version: number;
  /** 内嵌设置的 schema 版本，供导入方判断是否需要迁移 */
  settingsVersion: number;
  /** 导出时间（epoch ms），仅用于展示 */
  exportedAt: number;
  settings: AppSettings;
}

/** 模型配置里必须由配置包显式携带的字符串字段。 */
const REQUIRED_MODEL_TEXT_FIELDS = [
  'id',
  'providerId',
  'providerName',
  'name',
  'model',
  'baseUrl',
  'apiKey',
] as const;

/** 模型配置里的数值字段，缺失时按 0 处理，存在时必须是有限数值。 */
const NUMBER_MODEL_FIELDS = [
  'inputPerMillion',
  'outputPerMillion',
  'cacheInputPerMillion',
] as const;

/** 组合配置里必须由配置包显式携带的字符串字段。 */
const REQUIRED_COMBINATION_FIELDS = [
  'id',
  'name',
  'translateModelId',
  'explainModelId',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 把当前设置序列化为可跨设备传输的配置字符串。
 *
 * 不包含用量统计 / 费用记录。字符串为带版本号的 JSON，可人工识别为
 * 「划词译」配置包；包含 API Key，请妥善保管。
 */
export function exportConfigString(settings: AppSettings): string {
  const envelope: ConfigExportEnvelope = {
    app: CONFIG_EXPORT_APP,
    kind: CONFIG_EXPORT_KIND,
    version: CONFIG_EXPORT_VERSION,
    settingsVersion: CONFIG_SETTINGS_VERSION,
    exportedAt: Date.now(),
    settings,
  };
  return JSON.stringify(envelope);
}

/**
 * 校验配置包里的设置结构，返回可直接展示的错误信息。
 *
 * `normalizeSettings` 只负责归一化已知结构，对任意 JSON 是宽容的：它会把 `{}`
 * 变成默认配置，也会在遇到 `models: [null]` 时抛异常。导入会覆盖用户现有配置，
 * 因此必须先在这里拒绝结构不完整或已损坏的包，避免静默写入默认值或抛出未处理
 * 的异常。
 */
function validateSettingsPayload(payload: Record<string, unknown>): string | null {
  const { models, combinations } = payload;
  if (!Array.isArray(models)) {
    return '配置包缺少 models 字段，可能已损坏。';
  }
  if (!Array.isArray(combinations)) {
    return '配置包缺少 combinations 字段，可能已损坏。';
  }
  if (models.length === 0) {
    return '配置包内没有模型配置，无法导入。';
  }
  if (combinations.length === 0) {
    return '配置包内没有组合配置，无法导入。';
  }

  for (const [index, model] of models.entries()) {
    if (!isRecord(model)) {
      return `配置包第 ${index + 1} 个模型格式错误，可能已损坏。`;
    }
    for (const field of REQUIRED_MODEL_TEXT_FIELDS) {
      if (typeof model[field] !== 'string') {
        return `配置包第 ${index + 1} 个模型缺少 ${field} 字段，可能已损坏。`;
      }
    }
    for (const field of NUMBER_MODEL_FIELDS) {
      const value = model[field];
      if (value !== undefined && !Number.isFinite(value)) {
        return `配置包第 ${index + 1} 个模型的 ${field} 不是有效数值，可能已损坏。`;
      }
    }
  }

  for (const [index, combination] of combinations.entries()) {
    if (!isRecord(combination)) {
      return `配置包第 ${index + 1} 个组合格式错误，可能已损坏。`;
    }
    for (const field of REQUIRED_COMBINATION_FIELDS) {
      if (typeof combination[field] !== 'string') {
        return `配置包第 ${index + 1} 个组合缺少 ${field} 字段，可能已损坏。`;
      }
    }
  }

  for (const field of ['translatePrompt', 'explainPrompt'] as const) {
    const value = payload[field];
    if (value !== undefined && typeof value !== 'string') {
      return `配置包 ${field} 字段格式错误，可能已损坏。`;
    }
  }

  return null;
}

/** 组合引用的两个模型都必须出现在导入后的模型库里。 */
function validateCombinationReferences(settings: AppSettings): string | null {
  const ids = new Set(settings.models.map((model) => model.id));
  for (const [index, combination] of settings.combinations.entries()) {
    for (const modelId of [combination.translateModelId, combination.explainModelId]) {
      if (!ids.has(modelId)) {
        return `配置包第 ${index + 1} 个组合引用了不存在的模型（${modelId}），可能已损坏。`;
      }
    }
  }
  return null;
}

export type ParseConfigResult =
  | { ok: true; settings: AppSettings; exportedAt: number; settingsVersion: number }
  | { ok: false; error: string };

/**
 * 解析并校验配置字符串。失败时返回可直接展示给用户的错误信息。
 */
export function parseConfigString(text: string): ParseConfigResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: '配置字符串为空。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: '不是有效的 JSON，请检查复制的内容是否完整。' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: '配置包格式错误。' };
  }
  const envelope = parsed as Partial<ConfigExportEnvelope> & Record<string, unknown>;

  if (envelope.app !== CONFIG_EXPORT_APP || envelope.kind !== CONFIG_EXPORT_KIND) {
    return { ok: false, error: '这不是「划词译」导出的配置包。' };
  }
  if (typeof envelope.version !== 'number' || envelope.version < 1) {
    return { ok: false, error: '配置包缺少版本号，可能已损坏。' };
  }
  if (envelope.version > CONFIG_EXPORT_VERSION) {
    return {
      ok: false,
      error: `配置包协议版本过新（v${envelope.version}），请先升级插件再导入。`,
    };
  }
  if (!isRecord(envelope.settings)) {
    return { ok: false, error: '配置包缺少 settings 字段，可能已损坏。' };
  }

  const rawSettingsVersion = envelope.settingsVersion;
  if (rawSettingsVersion !== undefined && typeof rawSettingsVersion !== 'number') {
    return { ok: false, error: '配置包里 settingsVersion 字段格式错误，可能已损坏。' };
  }
  // 高版本的设置结构可能含有当前插件不认识的字段：一旦按当前 schema 归一化就会
  // 丢失这些字段，覆盖后的配置无法还原，所以必须拒绝而不是尝试迁移。
  if (
    typeof rawSettingsVersion === 'number' &&
    rawSettingsVersion > CONFIG_SETTINGS_VERSION
  ) {
    return {
      ok: false,
      error: `配置包来自更新的插件（设置版本 v${rawSettingsVersion}），导入会丢失新版本字段。请先升级插件再导入。`,
    };
  }

  const invalid = validateSettingsPayload(envelope.settings);
  if (invalid) {
    return { ok: false, error: invalid };
  }

  // 结构校验通过后，normalizeSettings 负责预设模型合并与旧版本迁移
  const settings = normalizeSettings(envelope.settings);
  const danglingReference = validateCombinationReferences(settings);
  if (danglingReference) {
    return { ok: false, error: danglingReference };
  }

  return {
    ok: true,
    settings,
    exportedAt: typeof envelope.exportedAt === 'number' ? envelope.exportedAt : 0,
    settingsVersion: typeof rawSettingsVersion === 'number' ? rawSettingsVersion : 0,
  };
}

/**
 * 判断输入框内容是否与解析出预览时的原文一致。
 *
 * 预览与「确认导入」写出的配置必须来自同一份文本，否则用户确认的内容会和实际
 * 写入的内容不一致。
 */
export function isSameConfigText(pendingText: string, currentText: string): boolean {
  return pendingText.trim() === currentText.trim();
}

/** 配置包概要，用于导入前向用户确认。 */
export function summarizeSettings(settings: AppSettings): {
  models: number;
  enabledModels: number;
  combinations: number;
  hasApiKeys: boolean;
} {
  return {
    models: settings.models.length,
    enabledModels: settings.models.filter((model) => model.enabled).length,
    combinations: settings.combinations.length,
    hasApiKeys: settings.models.some((model) => model.apiKey.trim() !== ''),
  };
}
