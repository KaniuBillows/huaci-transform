import { describe, expect, it } from 'vitest';
import {
  CONFIG_EXPORT_VERSION,
  exportConfigString,
  parseConfigString,
  summarizeSettings,
} from './config-exchange';
import { createDefaultSettings } from './defaults';

describe('exportConfigString', () => {
  it('produces a human-recognizable, versioned JSON package', () => {
    const text = exportConfigString(createDefaultSettings());
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe('huaci-transform');
    expect(parsed.kind).toBe('config');
    expect(parsed.version).toBe(CONFIG_EXPORT_VERSION);
    expect(typeof parsed.exportedAt).toBe('number');
    expect(typeof parsed.settings).toBe('object');
  });

  it('keeps API keys and enabled state for reuse after import', () => {
    const settings = createDefaultSettings();
    const target = settings.models[0]!;
    target.apiKey = 'sk-secret';
    target.enabled = true;

    const result = parseConfigString(exportConfigString(settings));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const model = result.settings.models.find((item) => item.id === target.id);
    expect(model?.apiKey).toBe('sk-secret');
    expect(model?.enabled).toBe(true);
  });

  it('never includes usage data', () => {
    const text = exportConfigString(createDefaultSettings());
    expect(text).not.toContain('usage');
    expect(text).not.toContain('transform.usage');
  });
});

describe('parseConfigString', () => {
  it('round-trips a full settings object', () => {
    const settings = createDefaultSettings();
    settings.models.push({
      id: 'custom:acme',
      providerId: 'acme',
      providerName: 'ACME',
      icon: 'custom',
      preset: false,
      name: 'Acme Turbo',
      model: 'acme-turbo',
      baseUrl: 'https://api.acme.example/v1',
      apiKey: 'k',
      enabled: true,
      inputPerMillion: 2,
      outputPerMillion: 8,
      cacheInputPerMillion: 0,
      currency: 'CNY',
    });
    settings.defaultCombinationId = settings.combinations[0]!.id;
    settings.translatePrompt = '请把 {{输入内容}} 翻译成 {{目标语言}}';
    settings.thinkingEnabled = true;

    const result = parseConfigString(exportConfigString(settings));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const imported = result.settings.models.find((item) => item.id === 'custom:acme');
    expect(imported?.model).toBe('acme-turbo');
    expect(imported?.apiKey).toBe('k');
    expect(imported?.currency).toBe('CNY');
    expect(result.settings.translatePrompt).toBe(settings.translatePrompt);
    expect(result.settings.thinkingEnabled).toBe(true);
  });

  it('rejects empty input', () => {
    expect(parseConfigString('').ok).toBe(false);
    expect(parseConfigString('   \n ').ok).toBe(false);
  });

  it('rejects invalid JSON with a readable error', () => {
    const result = parseConfigString('{oops');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('JSON');
    }
  });

  it('rejects packages from other apps or kinds', () => {
    const wrongApp = parseConfigString(
      JSON.stringify({ app: 'other-extension', kind: 'config', version: 1 }),
    );
    expect(wrongApp.ok).toBe(false);
    if (!wrongApp.ok) {
      expect(wrongApp.error).toContain('不是');
    }

    const wrongKind = parseConfigString(
      JSON.stringify({ app: 'huaci-transform', kind: 'usage', version: 1 }),
    );
    expect(wrongKind.ok).toBe(false);
  });

  it('rejects too-new protocol versions', () => {
    const parsed = JSON.parse(exportConfigString(createDefaultSettings()));
    parsed.version = 999;
    const result = parseConfigString(JSON.stringify(parsed));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('版本过新');
    }
  });

  it('rejects packages missing the settings field', () => {
    const result = parseConfigString(
      JSON.stringify({ app: 'huaci-transform', kind: 'config', version: 1 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('settings');
    }
  });

  it('normalizes presets merged from the imported models', () => {
    const settings = createDefaultSettings();
    const first = settings.models[0]!;
    first.apiKey = 'sk-a';
    const text = exportConfigString(settings);
    // 删除原始 settings 中的模型字段，模拟版本差异：导入方依赖 normalize 补全预设
    const parsed = JSON.parse(text);
    delete parsed.settings.models;
    delete parsed.settings.combinations;

    const result = parseConfigString(JSON.stringify(parsed));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.settings.models.length).toBeGreaterThan(0);
    expect(result.settings.combinations.length).toBeGreaterThan(0);
  });
});

describe('summarizeSettings', () => {
  it('counts models, combinations and API key presence', () => {
    const settings = createDefaultSettings();
    settings.models[0]!.enabled = true;
    settings.models[0]!.apiKey = 'k';
    const summary = summarizeSettings(settings);
    expect(summary.models).toBe(settings.models.length);
    expect(summary.enabledModels).toBe(1);
    expect(summary.combinations).toBe(settings.combinations.length);
    expect(summary.hasApiKeys).toBe(true);
  });
});
