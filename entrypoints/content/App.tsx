import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LLM_PORT } from '../../lib/port';
import { loadSettings, onSettingsChanged } from '../../lib/storage';
import type { AppSettings, ClientMessage, ServerEvent, TaskKind } from '../../lib/types';
import { ResultPanel, type PanelState } from './ResultPanel';
import { Toolbar } from './Toolbar';

interface SelectionBox {
  x: number;
  y: number;
  text: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function layoutPoint(x: number, y: number, width: number, height: number): { x: number; y: number } {
  return {
    x: clamp(x, 12, window.innerWidth - width - 12),
    y: clamp(y, 12, window.innerHeight - height - 12),
  };
}

function emptyPanel(task: TaskKind, text: string, profileId: string): PanelState {
  return {
    task,
    text,
    profileId,
    thinking: '',
    content: '',
    error: '',
    loading: true,
  };
}

function selectedText(): string {
  const value = window.getSelection()?.toString() ?? '';
  return value.trim();
}

function fromExtensionUi(ev: Event): boolean {
  const path = ev.composedPath();
  return path.some((node) => node instanceof Element && node.localName === 'huaci-transform');
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
    (task: TaskKind, text: string, profileId: string) => {
      const port = ensurePort();
      if (requestRef.current) {
        const abort: ClientMessage = { type: 'abort', requestId: requestRef.current };
        port.postMessage(abort);
      }
      const requestId = crypto.randomUUID();
      requestRef.current = requestId;
      setPanel(emptyPanel(task, text, profileId));
      setOpen(true);
      const msg: ClientMessage = { type: 'start', requestId, task, text, profileId };
      port.postMessage(msg);
    },
    [ensurePort],
  );

  useEffect(() => {
    const onMouseUp = (ev: MouseEvent) => {
      if (fromExtensionUi(ev)) {
        return;
      }
      const text = selectedText();
      if (!text) {
        setSel(null);
        return;
      }
      const point = layoutPoint(ev.clientX + 8, ev.clientY + 12, 160, 40);
      setSel({ x: point.x, y: point.y, text });
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  const defaultId = settings?.defaultProfileId ?? '';

  const onTranslate = () => {
    if (!sel || !settings) return;
    startTask('translate', sel.text, panel?.profileId || defaultId);
  };
  const onExplain = () => {
    if (!sel || !settings) return;
    startTask('explain', sel.text, panel?.profileId || defaultId);
  };

  const panelPos = useMemo(() => {
    const origin = sel ?? { x: 24, y: 24 };
    return layoutPoint(origin.x, origin.y + 42, 420, 280);
  }, [sel]);

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
        onTranslate={onTranslate}
        onExplain={onExplain}
      />
      {panel && (
        <ResultPanel
          x={panelPos.x}
          y={panelPos.y}
          open={open}
          typewriter={settings.typewriterEnabled}
          profiles={settings.profiles}
          state={panel}
          onClose={() => setOpen(false)}
          onCopy={() => navigator.clipboard.writeText(panel.content)}
          onSwitchProfile={(id) => startTask(panel.task, panel.text, id)}
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
      return { ...prev, meta: event, profileId: event.profileId };
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
