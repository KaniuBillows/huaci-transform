import { useCallback, useEffect, useRef, useState } from 'react';
import { LLM_PORT } from '../../lib/port';
import { defaultModelFor } from '../../lib/profile';
import { loadSettings, onSettingsChanged } from '../../lib/storage';
import type { AppSettings, ClientMessage, ServerEvent, TaskKind } from '../../lib/types';
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
  profileId: string;
  model: string;
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
    profileId: req.profileId,
    model: req.model,
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
    loadSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  const ensurePort = useCallback(() => {
    if (portRef.current) {
      return portRef.current;
    }
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
  }, []);

  const startTask = useCallback(
    (req: TaskRequest) => {
      const port = ensurePort();
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
        profileId: req.profileId,
        model: req.model,
      };
      port.postMessage(msg);
    },
    [ensurePort],
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
    const profile =
      settings.profiles.find((p) => p.id === settings.defaultProfileId) ?? settings.profiles[0];
    if (!profile) {
      return;
    }
    const pos = layoutPoint(sel.x, sel.y + 42, PANEL_WIDTH, PANEL_HEIGHT);
    startTask({
      task,
      text: sel.text,
      profileId: profile.id,
      model: defaultModelFor(profile, task),
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
          typewriter={settings.typewriterEnabled}
          profiles={settings.profiles}
          state={panel}
          onClose={() => setOpen(false)}
          onCopy={() => navigator.clipboard.writeText(panel.content)}
          onSwitchModel={(profileId, model) =>
            startTask({
              task: panel.task,
              text: panel.text,
              profileId,
              model,
              x: panel.x,
              y: panel.y,
            })
          }
          onOpenOptions={() => {
            const msg: ClientMessage = { type: 'open-options' };
            ensurePort().postMessage(msg);
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
      return { ...prev, meta: event, profileId: event.profileId, model: event.model };
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
