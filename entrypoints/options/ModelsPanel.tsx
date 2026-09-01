import { useMemo, useState } from 'react';
import { createCustomModel, isPresetProvider, PROVIDERS } from '../../lib/providers';
import { validateModel } from '../../lib/model_config';
import { formatPriceInput, parsePriceInput } from '../../lib/number';
import type { AppSettings, Currency, ModelConfig } from '../../lib/types';
import { VendorIcon } from './VendorIcon';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

interface ProviderGroup {
  id: string;
  name: string;
  icon: string;
  models: ModelConfig[];
}

function groupModels(models: ModelConfig[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const provider of PROVIDERS) {
    groups.set(provider.id, { ...provider, models: [] });
  }
  for (const model of models) {
    const key = model.providerId;
    const group = groups.get(key) ?? {
      id: key,
      name: model.providerName,
      icon: model.icon || 'custom',
      models: [],
    };
    group.models.push(model);
    groups.set(key, group);
  }
  return [...groups.values()].filter(
    (group) => group.models.length > 0 || isPresetProvider(group.id),
  );
}

function replaceModel(settings: AppSettings, model: ModelConfig): AppSettings {
  return {
    ...settings,
    models: settings.models.map((item) => (item.id === model.id ? model : item)),
  };
}

function modelStatus(model: ModelConfig): string {
  if (model.enabled) {
    return '已启用';
  }
  return model.preset ? '未启用' : '自定义';
}

export function ModelsPanel({ settings, onChange }: Props) {
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [error, setError] = useState('');
  const groups = useMemo(() => groupModels(settings.models), [settings.models]);

  const edit = (model: ModelConfig, enable = model.enabled) => {
    setEditing({ ...model, enabled: enable });
    setError('');
  };

  const addForProvider = (providerId: string) => {
    const provider = PROVIDERS.find((item) => item.id === providerId);
    const model = createCustomModel(provider);
    onChange({ ...settings, models: [...settings.models, model] });
    edit(model);
  };

  const save = () => {
    if (!editing) {
      return;
    }
    const missing = validateModel(editing);
    if (editing.enabled && missing.length > 0) {
      setError(`启用前请配置：${missing.join('、')}`);
      return;
    }
    onChange(replaceModel(settings, editing));
    setEditing(null);
    setError('');
  };

  const disable = (model: ModelConfig) => {
    onChange(replaceModel(settings, { ...model, enabled: false }));
    if (editing?.id === model.id) {
      setEditing(null);
    }
  };

  const remove = (model: ModelConfig) => {
    if (model.preset) {
      return;
    }
    const models = settings.models.filter((item) => item.id !== model.id);
    const combinations = settings.combinations.filter(
      (item) =>
        item.translateModelId !== model.id && item.explainModelId !== model.id,
    );
    onChange({ ...settings, models, combinations });
    setEditing(null);
  };

  const removeProvider = (group: ProviderGroup) => {
    if (isPresetProvider(group.id)) {
      return;
    }
    const ids = new Set(group.models.map((model) => model.id));
    const models = settings.models.filter((model) => !ids.has(model.id));
    const combinations = settings.combinations.filter(
      (item) => !ids.has(item.translateModelId) && !ids.has(item.explainModelId),
    );
    onChange({ ...settings, models, combinations });
    setEditing(null);
  };

  return (
    <>
      <h2>模型库</h2>
      <p className="lead">
        每个模型独立配置接口、密钥和单价；启用后才能加入翻译/解释组合。
      </p>
      {groups.map((group) => (
        <section className="provider-card" key={group.id}>
          <header className="provider-head">
            <VendorIcon icon={group.icon} />
            <div>
              <h3>{group.name}</h3>
              <span>{group.models.length} 个模型</span>
            </div>
            <div className="provider-actions">
              {!isPresetProvider(group.id) && (
                <button
                  type="button"
                  className="delete-model"
                  title={`删除厂商 ${group.name}`}
                  onClick={() => removeProvider(group)}
                >
                  删除厂商
                </button>
              )}
              <button
                type="button"
                className="add-model"
                title={`在 ${group.name} 下添加自定义模型`}
                onClick={() => addForProvider(group.id)}
              >
                + 添加模型
              </button>
            </div>
          </header>
          <div className="model-grid">
            {group.models.map((model) => (
              <article
                className={`model-card ${model.enabled ? 'enabled' : ''}`}
                key={model.id}
              >
                <button type="button" className="model-main" onClick={() => edit(model)}>
                  <span className="model-name">{model.name}</span>
                  <code>{model.model || '未填写模型 ID'}</code>
                  <span className={`status ${model.enabled ? 'on' : ''}`}>
                    {modelStatus(model)}
                  </span>
                </button>
                <div className="model-actions">
                  {!model.preset && (
                    <button
                      type="button"
                      className="icon-delete"
                      title="删除模型"
                      onClick={() => remove(model)}
                    >
                      删除
                    </button>
                  )}
                  <button
                    type="button"
                    className={`switch ${model.enabled ? 'on' : ''}`}
                    aria-label={`${model.enabled ? '停用' : '启用'} ${model.name}`}
                    onClick={() => (model.enabled ? disable(model) : edit(model, true))}
                  >
                    <i />
                  </button>
                </div>
              </article>
            ))}
            {group.models.length === 0 && (
              <button
                type="button"
                className="model-empty"
                onClick={() => addForProvider(group.id)}
              >
                + 添加第一个模型
              </button>
            )}
          </div>
        </section>
      ))}
      <button
        type="button"
        className="custom-provider"
        onClick={() => {
          const model = createCustomModel();
          onChange({ ...settings, models: [...settings.models, model] });
          edit(model);
        }}
      >
        <VendorIcon icon="custom" size={30} />
        添加自定义厂商与模型
      </button>

      {editing && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <section
            className="model-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="编辑模型"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <VendorIcon icon={editing.icon} />
              <div>
                <h3>{editing.name}</h3>
                <span>{editing.providerName}</span>
              </div>
              <button type="button" className="icon-close" onClick={() => setEditing(null)}>
                ×
              </button>
            </header>
            <ModelForm model={editing} onChange={setEditing} />
            {error && <p className="form-error">{error}</p>}
            <footer>
              {!editing.preset && (
                <button type="button" className="danger" onClick={() => remove(editing)}>
                  删除
                </button>
              )}
              <span />
              <button type="button" className="ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="button" className="primary" onClick={save}>
                {editing.enabled ? '保存并启用' : '保存'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(formatPriceInput(value));
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== '' && !/^\d*\.?\d*$/.test(next)) {
            return;
          }
          setText(next);
          const parsed = parsePriceInput(next);
          if (parsed !== null && next !== '' && next !== '.') {
            onChange(parsed);
          }
          if (next === '' || next === '.') {
            onChange(0);
          }
        }}
        onBlur={() => setText(formatPriceInput(value))}
      />
    </label>
  );
}

function ModelForm({
  model,
  onChange,
}: {
  model: ModelConfig;
  onChange: (model: ModelConfig) => void;
}) {
  const patch = (partial: Partial<ModelConfig>) => onChange({ ...model, ...partial });
  return (
    <div className="model-form">
      {!model.preset && (
        <label>
          厂商名称
          <input
            value={model.providerName}
            onChange={(event) => patch({ providerName: event.target.value })}
          />
        </label>
      )}
      <label>
        显示名称
        <input value={model.name} onChange={(event) => patch({ name: event.target.value })} />
      </label>
      <label>
        模型 ID
        <input value={model.model} onChange={(event) => patch({ model: event.target.value })} />
      </label>
      <label className="wide">
        Base URL
        <input
          value={model.baseUrl}
          placeholder="https://api.example.com/v1"
          onChange={(event) => patch({ baseUrl: event.target.value })}
        />
      </label>
      <label className="wide">
        API Key
        <input
          type="password"
          value={model.apiKey}
          placeholder="sk-..."
          onChange={(event) => patch({ apiKey: event.target.value })}
        />
      </label>
      <PriceField
        key={`${model.id}-input`}
        label="输入单价 / 百万 tokens"
        value={model.inputPerMillion}
        onChange={(inputPerMillion) => patch({ inputPerMillion })}
      />
      <PriceField
        key={`${model.id}-output`}
        label="输出单价 / 百万 tokens"
        value={model.outputPerMillion}
        onChange={(outputPerMillion) => patch({ outputPerMillion })}
      />
      <PriceField
        key={`${model.id}-cache`}
        label="缓存输入单价 / 百万 tokens"
        value={model.cacheInputPerMillion}
        onChange={(cacheInputPerMillion) => patch({ cacheInputPerMillion })}
      />
      <label>
        货币
        <select
          value={model.currency}
          onChange={(event) => patch({ currency: event.target.value as Currency })}
        >
          <option value="USD">USD</option>
          <option value="CNY">CNY</option>
        </select>
      </label>
      <label className="enable-field">
        <input
          type="checkbox"
          checked={model.enabled}
          onChange={(event) => patch({ enabled: event.target.checked })}
        />
        启用此模型
      </label>
      <p className="price-note wide">
        支持 `0.x` 小数。缓存命中部分按「缓存输入单价」计费，接口未返回缓存量时按 0 处理。
      </p>
    </div>
  );
}
