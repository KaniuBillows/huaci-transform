import type { TaskKind } from '../../lib/types';

interface Props {
  x: number;
  y: number;
  visible: boolean;
  active?: TaskKind;
  onTranslate: () => void;
  onExplain: () => void;
}

export function Toolbar(props: Props) {
  if (!props.visible) {
    return null;
  }
  return (
    <div className="tf-toolbar" style={{ left: props.x, top: props.y }}>
      <button
        type="button"
        className={props.active === 'translate' ? 'active' : ''}
        onClick={props.onTranslate}
      >
        翻译
      </button>
      <button
        type="button"
        className={props.active === 'explain' ? 'active' : ''}
        onClick={props.onExplain}
      >
        解释
      </button>
    </div>
  );
}
