import { useMemo } from 'react';
import { formatCostSummary } from '../../lib/billing';
import { formatDateTime, isSameLocalDay } from '../../lib/date';
import { formatMoney } from '../../lib/number';
import { sumBy } from '../../lib/slices';
import type { UsageRecord } from '../../lib/types';

interface Props {
  records: UsageRecord[];
  onClear: () => void;
}

function usageCombinationName(record: UsageRecord): string {
  const legacy = record as UsageRecord & { profileName?: string };
  return record.combinationName || legacy.profileName || '旧版记录';
}

export function UsagePanel({ records, onClear }: Props) {
  const today = useMemo(
    () => records.filter((r) => isSameLocalDay(r.createdAt, Date.now())),
    [records],
  );
  const tokens = sumBy(records, (r) => r.promptTokens + r.completionTokens);

  return (
    <>
      <h2>用量统计</h2>
      <p className="lead">全部保存在浏览器本地，卸载插件或清空后不可恢复。</p>
      <div className="stat">
        <div>
          今日费用
          <b>{formatCostSummary(today)}</b>
        </div>
        <div>
          累计费用
          <b>{formatCostSummary(records)}</b>
        </div>
        <div>
          累计 tokens
          <b>{tokens}</b>
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>任务</th>
              <th>配置</th>
              <th>模型</th>
              <th>tokens</th>
              <th>费用</th>
            </tr>
          </thead>
          <tbody>
            {[...records].reverse().slice(0, 80).map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.createdAt)}</td>
                <td>{r.task === 'explain' ? '解释' : '翻译'}</td>
                <td>{usageCombinationName(r)}</td>
                <td>{r.model}</td>
                <td>
                  {r.promptTokens}+{r.completionTokens}
                </td>
                <td>{formatMoney(r.cost, r.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <p className="hint">暂无记录</p>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="danger" onClick={onClear}>清空统计</button>
        </div>
      </div>
    </>
  );
}
