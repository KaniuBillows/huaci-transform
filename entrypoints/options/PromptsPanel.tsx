import type { AppSettings } from '../../lib/types';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

export function PromptsPanel({ settings, onChange }: Props) {
  return (
    <>
      <h2>提示词模版</h2>
      <p className="lead">可用占位符：{'{{目标语言}}'}、{'{{输入内容}}'}。目标语言由本地语种检测填入，不依赖提示词判断。</p>
      <div className="card">
        <div className="row">
          <span className="label">翻译</span>
          <textarea
            value={settings.translatePrompt}
            onChange={(e) => onChange({ ...settings, translatePrompt: e.target.value })}
          />
        </div>
        <div className="row">
          <span className="label">解释</span>
          <textarea
            value={settings.explainPrompt}
            onChange={(e) => onChange({ ...settings, explainPrompt: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
