import type { AppSettings, Currency, ModelPrice } from '../../lib/types';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

function emptyPrice(): ModelPrice {
  return {
    id: crypto.randomUUID(),
    model: '',
    inputPerMillion: 0,
    outputPerMillion: 0,
    currency: 'CNY',
  };
}

export function PricingPanel({ settings, onChange }: Props) {
  const patch = (id: string, partial: Partial<ModelPrice>) => {
    onChange({
      ...settings,
      prices: settings.prices.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    });
  };

  return (
    <>
      <h2>模型单价</h2>
      <p className="lead">按每百万 token 配置输入/输出价格，仅用于本地估算，不会上传。</p>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>模型</th>
              <th>输入 / M</th>
              <th>输出 / M</th>
              <th>货币</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {settings.prices.map((p) => (
              <tr key={p.id}>
                <td>
                  <input value={p.model} onChange={(e) => patch(p.id, { model: e.target.value })} />
                </td>
                <td>
                  <input
                    value={String(p.inputPerMillion)}
                    onChange={(e) => patch(p.id, { inputPerMillion: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    value={String(p.outputPerMillion)}
                    onChange={(e) => patch(p.id, { outputPerMillion: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <select
                    value={p.currency}
                    onChange={(e) => patch(p.id, { currency: e.target.value as Currency })}
                  >
                    <option value="CNY">CNY</option>
                    <option value="USD">USD</option>
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      onChange({ ...settings, prices: settings.prices.filter((x) => x.id !== p.id) })
                    }
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="ghost"
            onClick={() => onChange({ ...settings, prices: [...settings.prices, emptyPrice()] })}
          >
            添加单价
          </button>
        </div>
      </div>
    </>
  );
}
