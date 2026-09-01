import type { AppSettings } from '../../lib/types';

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

function Switch({
  on,
  onToggle,
  disabled = false,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`switch ${on ? 'on' : ''}`}
      onClick={onToggle}
      aria-pressed={on}
      disabled={disabled}
    >
      <i />
    </button>
  );
}

export function BehaviorPanel({ settings, onChange }: Props) {
  const setStream = (streamEnabled: boolean) => {
    onChange({
      ...settings,
      streamEnabled,
      typewriterEnabled: streamEnabled ? settings.typewriterEnabled : false,
    });
  };

  return (
    <>
      <h2>交互与模型行为</h2>
      <p className="lead">Stream 与逐字展示联动；深度思考可单独开关，并配置是否默认展开。</p>
      <div className="card">
        <div className="toggle">
          <div>
            <b>Stream 模式</b>
            <div className="hint">按 OpenAI SSE 协议边收边显示。关闭后结果整段返回。</div>
          </div>
          <Switch
            on={settings.streamEnabled}
            onToggle={() => setStream(!settings.streamEnabled)}
          />
        </div>
        <div className="toggle">
          <div>
            <b>逐字展示</b>
            <div className="hint">仅在 Stream 开启时可用；用打字机效果呈现流式内容。</div>
          </div>
          <Switch
            on={settings.streamEnabled && settings.typewriterEnabled}
            disabled={!settings.streamEnabled}
            onToggle={() =>
              onChange({
                ...settings,
                typewriterEnabled: !settings.typewriterEnabled,
              })
            }
          />
        </div>
        <div className="toggle">
          <div>
            <b>深度思考</b>
            <div className="hint">请求始终携带 enable_thinking（开/关）。关闭时忽略模型返回的思考内容。</div>
          </div>
          <Switch
            on={settings.thinkingEnabled}
            onToggle={() =>
              onChange({ ...settings, thinkingEnabled: !settings.thinkingEnabled })
            }
          />
        </div>
        <div className="toggle">
          <div>
            <b>默认展开思考过程</b>
            <div className="hint">仅在深度思考开启且模型返回思考内容时生效。</div>
          </div>
          <Switch
            on={settings.thinkingExpandedByDefault}
            disabled={!settings.thinkingEnabled}
            onToggle={() =>
              onChange({
                ...settings,
                thinkingExpandedByDefault: !settings.thinkingExpandedByDefault,
              })
            }
          />
        </div>
      </div>
    </>
  );
}
