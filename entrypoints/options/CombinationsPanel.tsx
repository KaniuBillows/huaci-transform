import { useMemo, useState } from 'react';
import { createEmptyCombination } from '../../lib/defaults';
import { enabledModels, isCombinationReady } from '../../lib/model_config';
import type { AppSettings, ModelCombination, ModelConfig } from '../../lib/types';
import { VendorIcon } from './VendorIcon';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

function ModelOption({ model }: { model: ModelConfig }) {
  return (
    <option value={model.id}>
      {model.providerName} · {model.name}
    </option>
  );
}

function modelName(models: ModelConfig[], id: string): string {
  const model = models.find((item) => item.id === id);
  return model ? `${model.providerName} · ${model.name}` : '未选择';
}

export function CombinationsPanel({ settings, onChange }: Props) {
  const models = useMemo(() => enabledModels(settings), [settings]);
  const [editing, setEditing] = useState<ModelCombination | null>(null);
  const [error, setError] = useState('');

  const add = () => {
    const first = models[0]?.id ?? '';
    setEditing(createEmptyCombination(first, first));
    setError('');
  };

  const edit = (combination: ModelCombination) => {
    setEditing({ ...combination });
    setError('');
  };

  const save = () => {
    if (!editing) {
      return;
    }
    if (editing.name.trim() === '') {
      setError('请填写配置名称');
      return;
    }
    if (!isCombinationReady(settings, editing)) {
      setError('翻译和解释都必须选择已启用的模型');
      return;
    }
    const exists = settings.combinations.some((item) => item.id === editing.id);
    const combinations = exists
      ? settings.combinations.map((item) => (item.id === editing.id ? editing : item))
      : [...settings.combinations, editing];
    onChange({
      ...settings,
      combinations,
      defaultCombinationId: settings.defaultCombinationId || editing.id,
    });
    setEditing(null);
  };

  const remove = (combination: ModelCombination) => {
    const combinations = settings.combinations.filter((item) => item.id !== combination.id);
    onChange({
      ...settings,
      combinations,
      defaultCombinationId:
        settings.defaultCombinationId === combination.id
          ? combinations[0]?.id ?? ''
          : settings.defaultCombinationId,
    });
  };

  return (
    <>
      <div className="section-title">
        <div>
          <h2>组合配置</h2>
          <p className="lead">
            将任意厂商的翻译模型与解释模型组合，例如 OpenAI 翻译、Claude 解释。
          </p>
        </div>
        <button type="button" className="primary" onClick={add} disabled={models.length === 0}>
          + 新建组合
        </button>
      </div>
      {models.length === 0 && (
        <div className="empty-state">
          <b>还没有可用模型</b>
          <p>请先到「模型库」配置 API Key 并启用至少一个模型。</p>
        </div>
      )}
      <div className="combination-list">
        {settings.combinations.map((combination) => {
          const ready = isCombinationReady(settings, combination);
          return (
            <article className={`combination-card ${ready ? '' : 'invalid'}`} key={combination.id}>
              <header>
                <h3>{combination.name}</h3>
                {combination.id === settings.defaultCombinationId && (
                  <span className="default-badge">默认</span>
                )}
              </header>
              <div className="combination-flow">
                <div>
                  <span>翻译</span>
                  <b>{modelName(settings.models, combination.translateModelId)}</b>
                </div>
                <i>→</i>
                <div>
                  <span>解释</span>
                  <b>{modelName(settings.models, combination.explainModelId)}</b>
                </div>
              </div>
              {!ready && <p className="form-error">引用的模型尚未启用</p>}
              <footer>
                <button type="button" className="ghost" onClick={() => edit(combination)}>
                  编辑
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={!ready}
                  onClick={() =>
                    onChange({ ...settings, defaultCombinationId: combination.id })
                  }
                >
                  设为默认
                </button>
                <button type="button" className="danger" onClick={() => remove(combination)}>
                  删除
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      {editing && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <section
            className="model-dialog combination-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="编辑组合"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <VendorIcon icon="custom" />
              <div>
                <h3>配置翻译与解释模型</h3>
                <span>两者完全独立，可跨厂商组合</span>
              </div>
              <button type="button" className="icon-close" onClick={() => setEditing(null)}>
                ×
              </button>
            </header>
            <div className="combination-form">
              <label>
                配置名称
                <input
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </label>
              <label>
                翻译模型
                <select
                  value={editing.translateModelId}
                  onChange={(event) =>
                    setEditing({ ...editing, translateModelId: event.target.value })
                  }
                >
                  <option value="">请选择</option>
                  {models.map((model) => <ModelOption key={model.id} model={model} />)}
                </select>
              </label>
              <label>
                解释模型
                <select
                  value={editing.explainModelId}
                  onChange={(event) =>
                    setEditing({ ...editing, explainModelId: event.target.value })
                  }
                >
                  <option value="">请选择</option>
                  {models.map((model) => <ModelOption key={model.id} model={model} />)}
                </select>
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <footer>
              <span />
              <button type="button" className="ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="button" className="primary" onClick={save}>
                保存组合
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
