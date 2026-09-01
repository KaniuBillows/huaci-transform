import { useEffect, useState } from 'react';
import { isSameLocalDay } from '../../lib/date';
import { formatMoney } from '../../lib/number';
import { sumBy } from '../../lib/slices';
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
  const cost = sumBy(today, (r) => r.cost);
  const currency = today[0]?.currency ?? 'CNY';

  return (
    <div className="wrap">
      <h1>划词译</h1>
      <p>划词后点「翻译」或「解释」</p>
      <div className="card">
        今日消耗
        <b>{formatMoney(cost, currency)}</b>
        <div className="muted">{today.length} 次调用</div>
        <select
          value={settings.defaultProfileId}
          onChange={async (e) => {
            const next = { ...settings, defaultProfileId: e.target.value };
            setSettings(next);
            await saveSettings(next);
          }}
        >
          {settings.profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={() => browser.runtime.openOptionsPage()}>
        打开设置
      </button>
    </div>
  );
}
