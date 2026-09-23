import { useState } from 'react';
import {
  exportConfigString,
  isSameConfigText,
  parseConfigString,
  summarizeSettings,
} from '../../lib/config-exchange';
import type { AppSettings } from '../../lib/types';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

/** 已解析但尚未确认的配置包；`text` 记录解析时的输入原文。 */
interface PendingImport {
  settings: AppSettings;
  text: string;
}

export function SyncPanel({ settings, onChange }: Props) {
  const [exported, setExported] = useState('');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [done, setDone] = useState(false);

  const handleExport = () => {
    setExported(exportConfigString(settings));
    setError('');
    setDone(false);
  };

  const handleCopy = async () => {
    try {
      await copyText(exported);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('复制失败，请手动选择文本复制。');
    }
  };

  const handleImportTextChange = (value: string) => {
    setImportText(value);
    // 输入一旦变化，之前的预览就与当前内容不一致，必须撤销以免误导入
    setPending(null);
    setError('');
    setDone(false);
  };

  const handleParse = () => {
    setError('');
    setDone(false);
    const result = parseConfigString(importText);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    setPending({ settings: result.settings, text: importText });
  };

  const handleApply = () => {
    if (!pending) {
      return;
    }
    // 双保险：即使输入框改回了相同内容，也用解析时的原文与当前内容核对
    if (!isSameConfigText(pending.text, importText)) {
      setPending(null);
      setError('输入内容已变化，请重新解析并预览后再确认导入。');
      return;
    }
    onChange(pending.settings);
    setPending(null);
    setImportText('');
    setDone(true);
    window.setTimeout(() => setDone(false), 3000);
  };

  const summary = pending ? summarizeSettings(pending.settings) : null;

  return (
    <>
      <h2>配置同步</h2>
      <p className="lead">导出 / 导入配置字符串，在另一台电脑或另一个浏览器实例中快速恢复可用环境。不含用量统计与费用记录。</p>

      <div className="card sync-export">
        <div className="section-title">
          <div>
            <b>导出配置</b>
            <div className="hint">包含 API Key、模型库、组合配置、行为设置与提示词模板，请妥善保管。</div>
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={handleExport}>
              导出配置
            </button>
            {exported !== '' && (
              <button type="button" className="ghost" onClick={handleCopy}>
                {copied ? '已复制' : '复制'}
              </button>
            )}
          </div>
        </div>
        {exported !== '' && (
          <textarea readOnly value={exported} style={{ marginTop: 12 }} onFocus={(e) => e.currentTarget.select()} />
        )}
      </div>

      <div className="card sync-import">
        <div className="section-title">
          <div>
            <b>导入配置</b>
            <div className="hint">粘贴另一台设备导出的字符串。导入会覆盖当前模型库 / 组合 / 行为 / 提示词，用量统计不受影响。</div>
          </div>
        </div>
        <textarea
          style={{ marginTop: 12 }}
          placeholder="粘贴导出的配置字符串…"
          value={importText}
          onChange={(e) => handleImportTextChange(e.target.value)}
        />
        <div className="actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="primary"
            onClick={handleParse}
            disabled={importText.trim() === ''}
          >
            解析并预览
          </button>
        </div>
        {error !== '' && <p className="error">{error}</p>}
        {pending !== null && summary !== null && (
          <div className="import-preview">
            <p>解析成功，导入后将覆盖当前配置：</p>
            <ul>
              <li>模型：{summary.models} 个（其中 {summary.enabledModels} 个已启用）</li>
              <li>组合配置：{summary.combinations} 个</li>
              <li>{summary.hasApiKeys ? '包含 API Key' : '不包含 API Key'}</li>
            </ul>
            <div className="hint">
              模型数为导入后的模型库总量：配置包内的模型会与插件内置模版模型合并。
            </div>
            <div className="actions">
              <button type="button" className="primary" onClick={handleApply}>
                确认导入
              </button>
              <button type="button" className="ghost" onClick={() => setPending(null)}>
                取消
              </button>
            </div>
          </div>
        )}
        {done && <p className="ok">已导入并覆盖当前配置，用量统计保持不变。</p>}
      </div>
    </>
  );
}
