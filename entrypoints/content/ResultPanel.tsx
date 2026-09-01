import { useEffect, useState } from 'react';
import { formatMoney } from '../../lib/number';
import type { ModelConfig, ServerEvent, TaskKind } from '../../lib/types';
import { useDisplayedText } from './use-displayed-text';

interface PanelState {
  task: TaskKind;
  text: string;
  combinationId: string;
  modelId: string;
  x: number;
  y: number;
  thinking: string;
  content: string;
  error: string;
  loading: boolean;
  meta?: Extract<ServerEvent, { type: 'meta' }>;
  usage?: Extract<ServerEvent, { type: 'usage' }>;
}

interface Props {
  open: boolean;
  typewriter: boolean;
  thinkingExpandedByDefault: boolean;
  models: ModelConfig[];
  state: PanelState;
  onClose: () => void;
  onCopy: () => void;
  onSwitchModel: (modelId: string) => void;
  onOpenOptions: () => void;
}

function CopyIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 8.5 6.2 12 13 4.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
      <path d="M10.5 3.5a2 2 0 0 0-2-2h-4a3 3 0 0 0-3 3v4a2 2 0 0 0 2 2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return [copied, () => setCopied(true)];
}

function ThinkingBlock({
  text,
  expandedByDefault,
  requestKey,
}: {
  text: string;
  expandedByDefault: boolean;
  requestKey: string;
}) {
  const [open, setOpen] = useState(expandedByDefault);
  useEffect(() => {
    setOpen(expandedByDefault);
  }, [requestKey, expandedByDefault]);
  return (
    <details
      className="tf-think"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>思考过程</summary>
      {text}
    </details>
  );
}

function groupModels(models: ModelConfig[]): Map<string, ModelConfig[]> {
  const groups = new Map<string, ModelConfig[]>();
  for (const model of models.filter((item) => item.enabled)) {
    const group = groups.get(model.providerName) ?? [];
    group.push(model);
    groups.set(model.providerName, group);
  }
  return groups;
}

export function ResultPanel(props: Props) {
  const { state } = props;
  const shown = useDisplayedText(state.content, props.typewriter);
  const [copied, markCopied] = useCopied();
  if (!props.open) {
    return null;
  }
  const groups = groupModels(props.models);

  return (
    <section className="tf-panel" style={{ left: state.x, top: state.y }}>
      <header className="tf-head">
        <select
          className="tf-select"
          value={state.modelId}
          title="切换模型"
          disabled={groups.size === 0}
          onChange={(e) => props.onSwitchModel(e.target.value)}
        >
          {groups.size === 0 && <option value="">未配置模型</option>}
          {[...groups.entries()].map(([providerName, models]) => (
            <optgroup key={providerName} label={providerName}>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="tf-spacer" />
        <button
          type="button"
          className="tf-icon"
          title={copied ? '已复制' : '复制'}
          onClick={() => {
            props.onCopy();
            markCopied();
          }}
        >
          <CopyIcon done={copied} />
        </button>
        <button type="button" className="tf-icon" title="关闭" onClick={props.onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className="tf-body">
        {state.task === 'translate' && state.meta && (
          <div className="tf-meta">
            {state.meta.sourceLanguage} → {state.meta.targetLanguage}
          </div>
        )}
        {state.thinking && (
          <ThinkingBlock
            text={state.thinking}
            expandedByDefault={props.thinkingExpandedByDefault}
            requestKey={`${state.combinationId}:${state.modelId}:${state.task}`}
          />
        )}
        {state.error && (
          <div className="tf-error">
            {state.error}
            <button type="button" className="tf-link" onClick={props.onOpenOptions}>
              打开设置
            </button>
          </div>
        )}
        {!state.error && !shown && state.loading && <div className="tf-empty">正在生成…</div>}
        {!state.error && shown}
      </div>
      <footer className="tf-foot">
        <span>
          {state.usage
            ? `${state.usage.promptTokens}+${state.usage.completionTokens} tokens · ${formatMoney(state.usage.cost, state.usage.currency)}`
            : state.loading
              ? '生成中'
              : ''}
        </span>
        <span>{state.meta?.combinationName}</span>
      </footer>
    </section>
  );
}

export type { PanelState };
