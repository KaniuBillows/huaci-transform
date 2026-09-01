import { useCallback, useEffect, useRef, useState } from 'react';
import { LLM_PORT } from '../../lib/port';
import { defaultCombination, modelForTask } from '../../lib/model_config';
import { CONTEXT_INVALIDATED_HINT, isExtensionAlive } from '../../lib/runtime';
import { loadSettings, onSettingsChanged } from '../../lib/storage';
import type { AppSettings, ClientMessage, ServerEvent, TaskKind } from '../../lib/types';
import { layoutPanelNearToolbar } from '../../lib/layout';
import { ResultPanel, type PanelState } from './ResultPanel';
import { Toolbar } from './Toolbar';

interface SelectionBox {
  x: number;
  y: number;
  text: string;
}

interface TaskRequest {
  task: TaskKind;
  text: string;
  combinationId: string;
  modelId: string;
  x: number;
  y: number;
}

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 280;
const TOOLBAR_WIDTH = 160;
const TOOLBAR_HEIGHT = 40;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function layoutPoint(x: number, y: number, width: number, height: number): { x: number; y: number } {
  return {
    x: clamp(x, 12, window.innerWidth - width - 12),
    y: clamp(y, 12, window.innerHeight - height - 12),
  };
}

function emptyPanel(req: TaskRequest): PanelState {
  return {
    task: req.task,
    text: req.text,
    combinationId: req.combinationId,
    modelId: req.modelId,
    x: req.x,
    y: req.y,
    thinking: '',
    content: '',
    error: '',
    loading: true,
  };
}

function selectedText(): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return '';
  }
  return selection.toString().trim();
}

function fromExtensionUi(ev: Event): boolean {
  return ev
    .composedPath()
    .some((node) => node instanceof Element && node.localName === 'huaci-transform');
}

export function ContentApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sel, setSel] = useState<SelectionBox | null>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const portRef = useRef<Browser.runtime.Port | null>(null);
  const requestRef = useRef('');

  useEffect(() => {
    if (!isExtensionAlive()) {
      return;
    }
    loadSettings()
      .then(setSettings)
      .catch(() => {
        /* 扩展上下文失效时忽略 */
      });
    try {
      return onSettingsChanged(setSettings);
    } catch {
      return undefined;
    }
  }, []);

  const ensurePort = useCallback((): Browser.runtime.Port | null => {
    if (!isExtensionAlive()) {
      portRef.current = null;
      return null;
    }
    if (portRef.current) {
      return portRef.current;
    }
    try {
      const port = browser.runtime.connect({ name: LLM_PORT });
      port.onMessage.addListener((raw) => {
        const event = raw as ServerEvent;
        if (event.requestId !== requestRef.current) {
          return;
        }
        setPanel((prev) => applyEvent(prev, event));
      });
      port.onDisconnect.addListener(() => {
        portRef.current = null;
      });
      portRef.current = port;
      return port;
    } catch {
      portRef.current = null;
      return null;
    }
  }, []);

  const showLocalError = useCallback((req: TaskRequest, message: string) => {
    setPanel({
      ...emptyPanel(req),
      loading: false,
      error: message,
    });
    setOpen(true);
  }, []);

  const startTask = useCallback(
    (req: TaskRequest) => {
      const port = ensurePort();
      if (!port) {
        showLocalError(req, CONTEXT_INVALIDATED_HINT);
        return;
      }
      try {
        if (requestRef.current) {
          const abort: ClientMessage = { type: 'abort', requestId: requestRef.current };
          port.postMessage(abort);
        }
        const requestId = crypto.randomUUID();
        requestRef.current = requestId;
        setPanel(emptyPanel(req));
        setOpen(true);
        const msg: ClientMessage = {
          type: 'start',
          requestId,
          task: req.task,
          text: req.text,
          combinationId: req.combinationId,
          modelId: req.modelId,
        };
        port.postMessage(msg);
      } catch {
        portRef.current = null;
        showLocalError(req, CONTEXT_INVALIDATED_HINT);
      }
    },
    [ensurePort, showLocalError],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
    setSel(null);
  }, []);

  useEffect(() => {
    let timer = 0;
    const onMouseDown = (ev: MouseEvent) => {
      if (!fromExtensionUi(ev)) {
        dismiss();
      }
    };
    // 单击处理时选区尚未塌陷，延后一拍再判定，避免工具条在点击空白处后重新定位
    const onMouseUp = (ev: MouseEvent) => {
      if (fromExtensionUi(ev)) {
        return;
      }
      const { clientX, clientY } = ev;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const text = selectedText();
        if (!text) {
          setSel(null);
          return;
        }
        const point = layoutPoint(clientX + 8, clientY + 12, TOOLBAR_WIDTH, TOOLBAR_HEIGHT);
        setSel({ x: point.x, y: point.y, text });
      }, 0);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        dismiss();
      }
    };
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dismiss]);

  const run = (task: TaskKind) => {
    if (!sel || !settings) {
      return;
    }
    const combination = defaultCombination(settings);
    const pos = layoutPanelNearToolbar(sel.x, sel.y, window.innerWidth, window.innerHeight);
    if (!combination) {
      setPanel({
        ...emptyPanel({
          task,
          text: sel.text,
          combinationId: '',
          modelId: '',
          x: pos.x,
          y: pos.y,
        }),
        loading: false,
        error: '请先在设置页创建组合配置',
      });
      setOpen(true);
      return;
    }
    const model = modelForTask(settings, combination, task);
    if (!model) {
      setPanel({
        ...emptyPanel({
          task,
          text: sel.text,
          combinationId: combination.id,
          modelId: '',
          x: pos.x,
          y: pos.y,
        }),
        loading: false,
        error: `当前组合没有已启用的${task === 'translate' ? '翻译' : '解释'}模型`,
      });
      setOpen(true);
      return;
    }
    startTask({
      task,
      text: sel.text,
      combinationId: combination.id,
      modelId: model.id,
      x: pos.x,
      y: pos.y,
    });
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="tf-root">
      <Toolbar
        x={sel?.x ?? 0}
        y={sel?.y ?? 0}
        visible={Boolean(sel)}
        active={open ? panel?.task : undefined}
        onTranslate={() => run('translate')}
        onExplain={() => run('explain')}
      />
      {panel && (
        <ResultPanel
          open={open}
          typewriter={settings.streamEnabled && settings.typewriterEnabled}
          thinkingExpandedByDefault={
            settings.thinkingEnabled && settings.thinkingExpandedByDefault
          }
          models={settings.models}
          state={panel}
          onClose={() => setOpen(false)}
          onCopy={() => navigator.clipboard.writeText(panel.content)}
          onSwitchModel={(modelId) =>
            startTask({
              task: panel.task,
              text: panel.text,
              combinationId: panel.combinationId,
              modelId,
              x: panel.x,
              y: panel.y,
            })
          }
          onOpenOptions={() => {
            const port = ensurePort();
            if (!port) {
              showLocalError(
                {
                  task: panel.task,
                  text: panel.text,
                  combinationId: panel.combinationId,
                  modelId: panel.modelId,
                  x: panel.x,
                  y: panel.y,
                },
                CONTEXT_INVALIDATED_HINT,
              );
              return;
            }
            try {
              const msg: ClientMessage = { type: 'open-options' };
              port.postMessage(msg);
            } catch {
              showLocalError(
                {
                  task: panel.task,
                  text: panel.text,
                  combinationId: panel.combinationId,
                  modelId: panel.modelId,
                  x: panel.x,
                  y: panel.y,
                },
                CONTEXT_INVALIDATED_HINT,
              );
            }
          }}
        />
      )}
    </div>
  );
}

function applyEvent(prev: PanelState | null, event: ServerEvent): PanelState | null {
  if (!prev) {
    return prev;
  }
  switch (event.type) {
    case 'meta':
      return {
        ...prev,
        meta: event,
        combinationId: event.combinationId,
        modelId: event.modelId,
      };
    case 'thinking':
      return { ...prev, thinking: prev.thinking + event.delta };
    case 'content':
      return { ...prev, content: prev.content + event.delta };
    case 'usage':
      return { ...prev, usage: event };
    case 'done':
      return { ...prev, loading: false };
    case 'error':
      return { ...prev, loading: false, error: event.message };
    default:
      return prev;
  }
}
