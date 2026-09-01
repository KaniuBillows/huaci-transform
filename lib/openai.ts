import type { ApiProfile } from './types';

export interface ChatParams {
  profile: ApiProfile;
  model: string;
  userPrompt: string;
  stream: boolean;
  thinking: boolean;
}

export interface ChatHandlers {
  onThinking: (delta: string) => void;
  onContent: (delta: string) => void;
  onUsage: (promptTokens: number, completionTokens: number) => void;
}

interface UsageJson {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface DeltaJson {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
  thinking?: string | null;
}

function completionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

function thinkingText(delta: DeltaJson): string {
  return delta.reasoning_content || delta.reasoning || delta.thinking || '';
}

function buildBody(params: ChatParams): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: [{ role: 'user', content: params.userPrompt }],
    stream: params.stream,
  };
  if (params.stream) {
    body.stream_options = { include_usage: true };
  }
  if (params.thinking) {
    body.enable_thinking = true;
  }
  return body;
}

function parseSseData(line: string): unknown | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) {
    return undefined;
  }
  const payload = trimmed.slice(5).trim();
  if (payload === '' || payload === '[DONE]') {
    return undefined;
  }
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function emitChoice(choice: unknown, handlers: ChatHandlers): void {
  if (!choice || typeof choice !== 'object') {
    return;
  }
  const rec = choice as { delta?: DeltaJson; message?: DeltaJson };
  const part = rec.delta ?? rec.message;
  if (!part) {
    return;
  }
  const think = thinkingText(part);
  if (think) {
    handlers.onThinking(think);
  }
  if (part.content) {
    handlers.onContent(part.content);
  }
}

function emitUsage(usage: UsageJson | undefined, handlers: ChatHandlers): void {
  if (!usage) {
    return;
  }
  handlers.onUsage(usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
}

function applyChunk(raw: unknown, handlers: ChatHandlers): void {
  if (!raw || typeof raw !== 'object') {
    return;
  }
  const rec = raw as { choices?: unknown[]; usage?: UsageJson };
  if (Array.isArray(rec.choices)) {
    for (const choice of rec.choices) {
      emitChoice(choice, handlers);
    }
  }
  emitUsage(rec.usage, handlers);
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatHandlers,
  signal: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const data = parseSseData(line);
      if (data !== undefined) {
        applyChunk(data, handlers);
      }
    }
  }
}

/**
 * 调用 OpenAI 兼容 Chat Completions，支持 stream。
 */
export async function chatComplete(
  params: ChatParams,
  handlers: ChatHandlers,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(completionsUrl(params.profile.baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.profile.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(params)),
    signal,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`接口 ${response.status}: ${detail.slice(0, 400)}`);
  }
  if (params.stream && response.body) {
    await readSseStream(response.body, handlers, signal);
    return;
  }
  const json: unknown = await response.json();
  applyChunk(json, handlers);
}
