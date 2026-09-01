import { useState } from 'react';
import type { ApiProfile, AppSettings } from '../../lib/types';
import { createEmptyProfile } from '../../lib/defaults';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

export function ProfilesPanel({ settings, onChange }: Props) {
  const [editId, setEditId] = useState(settings.defaultProfileId);
  const current = settings.profiles.find((p) => p.id === editId) ?? settings.profiles[0];

  const patch = (id: string, partial: Partial<ApiProfile>) => {
    onChange({
      ...settings,
      profiles: settings.profiles.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    });
  };

  const add = () => {
    const profile = { ...createEmptyProfile(), name: `配置 ${settings.profiles.length + 1}` };
    onChange({
      ...settings,
      profiles: [...settings.profiles, profile],
    });
    setEditId(profile.id);
  };

  const remove = (id: string) => {
    const profiles = settings.profiles.filter((p) => p.id !== id);
    if (profiles.length === 0) {
      const fallback = createEmptyProfile();
      onChange({ ...settings, profiles: [fallback], defaultProfileId: fallback.id });
      setEditId(fallback.id);
      return;
    }
    const first = profiles[0];
    if (!first) {
      return;
    }
    const defaultProfileId = profiles.some((p) => p.id === settings.defaultProfileId)
      ? settings.defaultProfileId
      : first.id;
    onChange({ ...settings, profiles, defaultProfileId });
    setEditId(first.id);
  };

  return (
    <>
      <h2>API 配置</h2>
      <p className="lead">可保存多套 OpenAI 兼容接口。Key 只存在本机，不会上传。</p>
      <div className="card">
        <div className="row">
          <span className="label">编辑配置</span>
          <select value={current?.id} onChange={(e) => setEditId(e.target.value)}>
            {settings.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === settings.defaultProfileId ? '（默认）' : ''}
              </option>
            ))}
          </select>
        </div>
        {current && (
          <>
            <div className="row">
              <span className="label">名称</span>
              <input value={current.name} onChange={(e) => patch(current.id, { name: e.target.value })} />
            </div>
            <div className="row">
              <span className="label">Base URL</span>
              <input
                value={current.baseUrl}
                placeholder="https://api.openai.com/v1"
                onChange={(e) => patch(current.id, { baseUrl: e.target.value })}
              />
            </div>
            <div className="row">
              <span className="label">API Key</span>
              <input
                type="password"
                value={current.apiKey}
                onChange={(e) => patch(current.id, { apiKey: e.target.value })}
              />
            </div>
            <div className="row">
              <span className="label">翻译模型</span>
              <input
                value={current.translateModel}
                onChange={(e) => patch(current.id, { translateModel: e.target.value })}
              />
            </div>
            <div className="row">
              <span className="label">解释模型</span>
              <input
                value={current.explainModel}
                onChange={(e) => patch(current.id, { explainModel: e.target.value })}
              />
            </div>
          </>
        )}
        <div className="actions">
          <button type="button" className="primary" onClick={() => current && onChange({ ...settings, defaultProfileId: current.id })}>
            设为默认
          </button>
          <button type="button" className="ghost" onClick={add}>新增配置</button>
          <button type="button" className="danger" onClick={() => current && remove(current.id)}>删除当前</button>
        </div>
        <p className="hint">悬浮窗内可临时切换配置，不必改默认项。</p>
      </div>
    </>
  );
}
