import { SETTINGS_VERSION } from './defaults';
import { normalizeSettings } from './storage';
import type { AppSettings } from './types';

/** 配置包协议版本。改动导出/导入的封装结构时递增，旧版本仍可导入。 */
export const CONFIG_EXPORT_VERSION = 1;

export const CONFIG_EXPORT_APP = 'huaci-transform';
export const CONFIG_EXPORT_KIND = 'config';

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
    settingsVersion: SETTINGS_VERSION,
    exportedAt: Date.now(),
    settings,
  };
  return JSON.stringify(envelope);
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

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: '配置包格式错误。' };
  }
  const envelope = parsed as Partial<ConfigExportEnvelope>;

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
  if (typeof envelope.settings !== 'object' || envelope.settings === null) {
    return { ok: false, error: '配置包缺少 settings 字段，可能已损坏。' };
  }

  // normalizeSettings 负责结构校验、预设模型合并与旧版本迁移
  const settings = normalizeSettings(envelope.settings);
  if (settings.combinations.length === 0) {
    return { ok: false, error: '配置包内没有有效的组合配置，无法导入。' };
  }

  return {
    ok: true,
    settings,
    exportedAt: typeof envelope.exportedAt === 'number' ? envelope.exportedAt : 0,
    settingsVersion:
      typeof envelope.settingsVersion === 'number' ? envelope.settingsVersion : 0,
  };
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
