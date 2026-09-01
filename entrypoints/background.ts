import { createUsageRecord, estimateUsage } from '../lib/billing';
import { LLM_PORT } from '../lib/port';
import { chatComplete } from '../lib/openai';
import { openOptionsPage } from '../lib/options-page';
import { defaultModelFor } from '../lib/profile';
import { buildPrompt } from '../lib/prompts';
import { appendUsage, loadSettings } from '../lib/storage';
import { nonempty } from '../lib/strings';
import type { ApiProfile, AppSettings, ClientMessage, ServerEvent, StartTaskMessage } from '../lib/types';

const inflight = new Map<string, AbortController>();

function pickProfile(settings: AppSettings, profileId?: string): ApiProfile {
  const wanted = profileId || settings.defaultProfileId;
  const found = settings.profiles.find((p) => p.id === wanted) ?? settings.profiles[0];
  if (!found) {
    throw new Error('请先在设置页添加 API 配置');
  }
  return found;
}

function pickModel(profile: ApiProfile, msg: StartTaskMessage): string {
  return nonempty(msg.model ?? '', defaultModelFor(profile, msg.task));
}

function post(port: Browser.runtime.Port, event: ServerEvent): void {
  port.postMessage(event);
}

async function runStart(port: Browser.runtime.Port, msg: StartTaskMessage): Promise<void> {
  inflight.get(msg.requestId)?.abort();
  const controller = new AbortController();
  inflight.set(msg.requestId, controller);

  const settings = await loadSettings();
  const profile = pickProfile(settings, msg.profileId);
  if (!profile?.apiKey) {
    post(port, { type: 'error', requestId: msg.requestId, message: '请先在设置页填写 API Key' });
    return;
  }
  const model = pickModel(profile, msg);
  const built = buildPrompt(msg.task, msg.text, settings.translatePrompt, settings.explainPrompt);
  post(port, {
    type: 'meta',
    requestId: msg.requestId,
    sourceLanguage: built.sourceLabel,
    targetLanguage: built.targetLabel,
    model,
    profileId: profile.id,
    profileName: profile.name,
  });

  let promptTokens = 0;
  let completionTokens = 0;
  await chatComplete(
    {
      profile,
      model,
      userPrompt: built.user,
      stream: settings.streamEnabled,
      thinking: settings.thinkingEnabled,
    },
    {
      onThinking: (delta) => post(port, { type: 'thinking', requestId: msg.requestId, delta }),
      onContent: (delta) => post(port, { type: 'content', requestId: msg.requestId, delta }),
      onUsage: (p, c) => {
        promptTokens = p;
        completionTokens = c;
      },
    },
    controller.signal,
  );

  const snapshot = estimateUsage(settings, model, promptTokens, completionTokens);
  await appendUsage(
    createUsageRecord(snapshot, {
      profileId: profile.id,
      profileName: profile.name,
      task: msg.task,
      model,
    }),
  );
  post(port, {
    type: 'usage',
    requestId: msg.requestId,
    promptTokens: snapshot.promptTokens,
    completionTokens: snapshot.completionTokens,
    cost: snapshot.cost,
    currency: snapshot.currency,
  });
  post(port, { type: 'done', requestId: msg.requestId });
}

function handleMessage(port: Browser.runtime.Port, raw: ClientMessage): void {
  if (raw.type === 'open-options') {
    void openOptionsPage();
    return;
  }
  if (raw.type === 'abort') {
    inflight.get(raw.requestId)?.abort();
    inflight.delete(raw.requestId);
    return;
  }
  runStart(port, raw).catch((err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    post(port, { type: 'error', requestId: raw.requestId, message });
  }).finally(() => {
    inflight.delete(raw.requestId);
  });
}

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== LLM_PORT) {
      return;
    }
    port.onMessage.addListener((raw) => {
      handleMessage(port, raw as ClientMessage);
    });
  });

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void openOptionsPage();
    }
  });
});
