import { useEffect, useState } from 'react';
import { formatCostSummary } from '../../lib/billing';
import { isSameLocalDay } from '../../lib/date';
import { openOptionsPage } from '../../lib/options-page';
import { loadSettings, loadUsage, saveSettings } from '../../lib/storage';
import type { AppSettings, UsageRecord } from '../../lib/types';

export function PopupApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [usage, setUsage] = useState<UsageRecord[]>([]);

  useEffect(() => {
    loadSettings().then(setSettings);
    loadUsage().then(setUsage);
  }, []);

  if (!settings) {
    return null;
  }
  const today = usage.filter((r) => isSameLocalDay(r.createdAt, Date.now()));

  return (
    <div className="wrap">
      <h1>划词译</h1>
      <p>划词后点「翻译」或「解释」</p>
      <div className="card">
        今日消耗
        <b>{formatCostSummary(today)}</b>
        <div className="muted">{today.length} 次调用</div>
        <select
          value={settings.defaultCombinationId}
          onChange={async (e) => {
            const next = { ...settings, defaultCombinationId: e.target.value };
            setSettings(next);
            await saveSettings(next);
          }}
        >
          {settings.combinations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={() => void openOptionsPage()}>
        打开设置
      </button>
    </div>
  );
}
