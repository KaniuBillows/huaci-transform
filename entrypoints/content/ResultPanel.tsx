import type { ApiProfile, ServerEvent, TaskKind } from '../../lib/types';
import { formatMoney } from '../../lib/number';
import { useDisplayedText } from './use-displayed-text';

interface PanelState {
  task: TaskKind;
  text: string;
  profileId: string;
  thinking: string;
  content: string;
  error: string;
  loading: boolean;
  meta?: Extract<ServerEvent, { type: 'meta' }>;
  usage?: Extract<ServerEvent, { type: 'usage' }>;
}

interface Props {
  x: number;
  y: number;
  open: boolean;
  typewriter: boolean;
  profiles: ApiProfile[];
  state: PanelState;
  onClose: () => void;
  onCopy: () => void;
  onSwitchProfile: (profileId: string) => void;
}

function titleOf(task: TaskKind): string {
  return task === 'explain' ? '解释' : '翻译';
}

export function ResultPanel(props: Props) {
  const shown = useDisplayedText(props.state.content, props.typewriter);
  if (!props.open) {
    return null;
  }
  const { state } = props;
  return (
    <section className="tf-panel" style={{ left: props.x, top: props.y }}>
      <header className="tf-head">
        <p className="tf-title">{titleOf(state.task)}</p>
        <select
          className="tf-select"
          value={state.profileId}
          onChange={(e) => props.onSwitchProfile(e.target.value)}
        >
          {props.profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="tf-icon" title="复制" onClick={props.onCopy}>
          复制
        </button>
        <button type="button" className="tf-icon" title="关闭" onClick={props.onClose}>
          ×
        </button>
      </header>
      <div className="tf-body">
        {state.meta && (
          <div className="tf-meta">
            {state.task === 'translate'
              ? `${state.meta.sourceLanguage} → ${state.meta.targetLanguage} · ${state.meta.model}`
              : state.meta.model}
          </div>
        )}
        {state.thinking && (
          <details className="tf-think" open>
            <summary>思考过程</summary>
            {state.thinking}
          </details>
        )}
        {state.error && <div className="tf-error">{state.error}</div>}
        {!state.error && !shown && state.loading && <div className="tf-empty">正在生成…</div>}
        {!state.error && shown && shown}
      </div>
      <footer className="tf-foot">
        <span>
          {state.usage
            ? `${state.usage.promptTokens}+${state.usage.completionTokens} tokens · ${formatMoney(state.usage.cost, state.usage.currency)}`
            : state.loading
              ? '流式输出中'
              : ''}
        </span>
        <span>{state.meta?.profileName}</span>
      </footer>
    </section>
  );
}

export type { PanelState };
