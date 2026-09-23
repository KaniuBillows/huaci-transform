import { describe, expect, it } from 'vitest';
import {
  CONFIG_EXPORT_VERSION,
  CONFIG_SETTINGS_VERSION,
  exportConfigString,
  isSameConfigText,
  parseConfigString,
  summarizeSettings,
} from './config-exchange';
import { createDefaultSettings, SETTINGS_VERSION } from './defaults';

/** 构造一个结构完整的配置包字符串，便于按需篡改后测试校验逻辑。 */
function packageWith(mutate: (payload: Record<string, unknown>) => void): string {
  const payload = JSON.parse(exportConfigString(createDefaultSettings())) as Record<
    string,
    unknown
  >;
  mutate(payload);
  return JSON.stringify(payload);
}

describe('exportConfigString', () => {
  it('produces a human-recognizable, versioned JSON package', () => {
    const text = exportConfigString(createDefaultSettings());
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe('huaci-transform');
    expect(parsed.kind).toBe('config');
    expect(parsed.version).toBe(CONFIG_EXPORT_VERSION);
    expect(parsed.settingsVersion).toBe(SETTINGS_VERSION);
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

  it('rejects too-new settings schema versions', () => {
    const result = parseConfigString(
      packageWith((payload) => {
        payload.settingsVersion = CONFIG_SETTINGS_VERSION + 1;
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('升级插件');
    }
  });

  it('accepts settings produced by an older plugin schema', () => {
    const result = parseConfigString(
      packageWith((payload) => {
        payload.settingsVersion = 1;
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.settingsVersion).toBe(SETTINGS_VERSION);
    }
  });

  it('rejects a settings object that would silently become the defaults', () => {
    const result = parseConfigString(packageWith((payload) => void (payload.settings = {})));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('models');
    }
  });

  it('rejects malformed entries instead of throwing', () => {
    const nullModel = parseConfigString(
      packageWith((payload) => {
        (payload.settings as Record<string, unknown>).models = [null];
      }),
    );
    expect(nullModel.ok).toBe(false);

    const emptyCombination = parseConfigString(
      packageWith((payload) => {
        (payload.settings as Record<string, unknown>).combinations = [{}];
      }),
    );
    expect(emptyCombination.ok).toBe(false);

    const missingId = parseConfigString(
      packageWith((payload) => {
        (payload.settings as Record<string, unknown>).models = [{ name: 'x' }];
      }),
    );
    expect(missingId.ok).toBe(false);
    if (!missingId.ok) {
      expect(missingId.error).toContain('id');
    }
  });

  it('rejects empty model or combination lists', () => {
    const noModels = parseConfigString(
      packageWith((payload) => {
        (payload.settings as Record<string, unknown>).models = [];
      }),
    );
    expect(noModels.ok).toBe(false);

    const noCombinations = parseConfigString(
      packageWith((payload) => {
        (payload.settings as Record<string, unknown>).combinations = [];
      }),
    );
    expect(noCombinations.ok).toBe(false);
  });

  it('rejects combinations pointing at models that are not in the package', () => {
    const result = parseConfigString(
      packageWith((payload) => {
        const settings = payload.settings as Record<string, unknown>;
        // 组合引用的模型 id 与包内模型不一致，导入后会得到无法使用的组合
        settings.combinations = [
          {
            id: 'combo',
            name: '组合',
            translateModelId: 'missing:a',
            explainModelId: 'missing:b',
          },
        ];
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('不存在的模型');
    }
  });

  it('rejects non-string prompt fields', () => {
    const result = parseConfigString(
      packageWith((payload) => {
        (payload.settings as Record<string, unknown>).translatePrompt = 42;
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('translatePrompt');
    }
  });
});

describe('isSameConfigText', () => {
  it('ignores surrounding whitespace but detects edited content', () => {
    const text = exportConfigString(createDefaultSettings());
    expect(isSameConfigText(text, `  ${text}\n`)).toBe(true);
    expect(isSameConfigText(text, `${text} `)).toBe(true);
    expect(isSameConfigText(text, '{"app":"other"}')).toBe(false);
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
