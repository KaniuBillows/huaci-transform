import { useEffect, useState } from 'react';
import { clearUsage, loadSettings, loadUsage, saveSettings } from '../../lib/storage';
import type { AppSettings, UsageRecord } from '../../lib/types';
import { BehaviorPanel } from './BehaviorPanel';
import { CombinationsPanel } from './CombinationsPanel';
import { ModelsPanel } from './ModelsPanel';
import { PromptsPanel } from './PromptsPanel';
import { SyncPanel } from './SyncPanel';
import { UsagePanel } from './UsagePanel';
import './style.css';

type Tab = 'models' | 'combinations' | 'behavior' | 'prompts' | 'sync' | 'usage';

const TABS: { id: Tab; label: string }[] = [
  { id: 'models', label: '模型库' },
  { id: 'combinations', label: '组合配置' },
  { id: 'behavior', label: '交互行为' },
  { id: 'prompts', label: '提示词' },
  { id: 'sync', label: '配置同步' },
  { id: 'usage', label: '用量' },
];

export function OptionsApp() {
  const [tab, setTab] = useState<Tab>('models');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
    loadUsage().then(setUsage);
  }, []);

  const persist = async (next: AppSettings) => {
    setSettings(next);
    await saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="page">
      <aside className="side">
        <div className="brand">
          <img src="/icon/128.png" alt="" />
          <h1>
            划词译
            <span>本地配置 · 自托管接口</span>
          </h1>
        </div>
        <nav className="nav">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        {tab === 'models' && <ModelsPanel settings={settings} onChange={persist} />}
        {tab === 'combinations' && (
          <CombinationsPanel settings={settings} onChange={persist} />
        )}
        {tab === 'behavior' && <BehaviorPanel settings={settings} onChange={persist} />}
        {tab === 'prompts' && <PromptsPanel settings={settings} onChange={persist} />}
        {tab === 'sync' && <SyncPanel settings={settings} onChange={persist} />}
        {tab === 'usage' && (
          <UsagePanel
            records={usage}
            onClear={async () => {
              await clearUsage();
              setUsage([]);
            }}
          />
        )}
        {saved && <p className="ok">已保存到本地</p>}
      </main>
    </div>
  );
}
