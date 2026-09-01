import { useEffect, useState } from 'react';
import { formatMoney } from '../../lib/number';
import { profileModels } from '../../lib/profile';
import type { ApiProfile, ServerEvent, TaskKind } from '../../lib/types';
import { useDisplayedText } from './use-displayed-text';

interface PanelState {
  task: TaskKind;
  text: string;
  profileId: string;
  model: string;
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
  profiles: ApiProfile[];
  state: PanelState;
  onClose: () => void;
  onCopy: () => void;
  onSwitchModel: (profileId: string, model: string) => void;
  onOpenOptions: () => void;
}

const SEP = '\u0000';

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

function hasOption(profiles: ApiProfile[], profileId: string, model: string): boolean {
  const profile = profiles.find((p) => p.id === profileId);
  return Boolean(profile && profileModels(profile).includes(model));
}

export function ResultPanel(props: Props) {
  const { state } = props;
  const shown = useDisplayedText(state.content, props.typewriter);
  const [copied, markCopied] = useCopied();
  if (!props.open) {
    return null;
  }
  const value = `${state.profileId}${SEP}${state.model}`;
  const missing = state.model && !hasOption(props.profiles, state.profileId, state.model);

  return (
    <section className="tf-panel" style={{ left: state.x, top: state.y }}>
      <header className="tf-head">
        <select
          className="tf-select"
          value={value}
          title="切换模型"
          onChange={(e) => {
            const [profileId, model] = e.target.value.split(SEP);
            props.onSwitchModel(profileId ?? '', model ?? '');
          }}
        >
          {missing && <option value={value}>{state.model}</option>}
          {props.profiles.map((p) => (
            <optgroup key={p.id} label={p.name}>
              {profileModels(p).map((m) => (
                <option key={m} value={`${p.id}${SEP}${m}`}>
                  {m}
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
          <details className="tf-think" open>
            <summary>思考过程</summary>
            {state.thinking}
          </details>
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
        <span>{state.meta?.profileName}</span>
      </footer>
    </section>
  );
}

export type { PanelState };
