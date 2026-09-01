import type { AppSettings } from '../../lib/types';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`switch ${on ? 'on' : ''}`} onClick={onToggle} aria-pressed={on}>
      <i />
    </button>
  );
}

export function BehaviorPanel({ settings, onChange }: Props) {
  return (
    <>
      <h2>交互与模型行为</h2>
      <p className="lead">流式输出、逐字展示和深度思考均可独立开关。</p>
      <div className="card">
        <div className="toggle">
          <div>
            <b>Stream 模式</b>
            <div className="hint">按 OpenAI SSE 协议边收边显示。</div>
          </div>
          <Switch
            on={settings.streamEnabled}
            onToggle={() => onChange({ ...settings, streamEnabled: !settings.streamEnabled })}
          />
        </div>
        <div className="toggle">
          <div>
            <b>逐字展示</b>
            <div className="hint">在收到文本后用打字机效果呈现，关闭则整段立即更新。</div>
          </div>
          <Switch
            on={settings.typewriterEnabled}
            onToggle={() => onChange({ ...settings, typewriterEnabled: !settings.typewriterEnabled })}
          />
        </div>
        <div className="toggle">
          <div>
            <b>深度思考</b>
            <div className="hint">请求体会附带 enable_thinking。需模型支持，否则可能报错。</div>
          </div>
          <Switch
            on={settings.thinkingEnabled}
            onToggle={() => onChange({ ...settings, thinkingEnabled: !settings.thinkingEnabled })}
          />
        </div>
      </div>
    </>
  );
}
