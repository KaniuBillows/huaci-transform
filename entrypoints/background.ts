import { createUsageRecord, estimateUsage } from '../lib/billing';
import { LLM_PORT } from '../lib/port';
import { chatComplete } from '../lib/openai';
import { openOptionsPage } from '../lib/options-page';
import {
  defaultCombination,
  modelForTask,
  validateModel,
} from '../lib/model_config';
import { buildPrompt } from '../lib/prompts';
import { appendUsage, loadSettings } from '../lib/storage';
import type {
  AppSettings,
  ClientMessage,
  ModelCombination,
  ModelConfig,
  ServerEvent,
  StartTaskMessage,
} from '../lib/types';

const inflight = new Map<string, AbortController>();

function pickCombination(
  settings: AppSettings,
  combinationId?: string,
): ModelCombination {
  const found =
    settings.combinations.find((item) => item.id === combinationId) ??
    defaultCombination(settings);
  if (!found) {
    throw new Error('请先在设置页添加组合配置');
  }
  return found;
}

function pickModel(
  settings: AppSettings,
  combination: ModelCombination,
  msg: StartTaskMessage,
): ModelConfig {
  const override = settings.models.find(
    (model) => model.id === msg.modelId && model.enabled,
  );
  const found = override ?? modelForTask(settings, combination, msg.task);
  if (!found) {
    throw new Error('当前组合没有可用模型，请先在设置页启用并配置模型');
  }
  const missing = validateModel(found);
  if (missing.length > 0) {
    throw new Error(`模型 ${found.name} 尚未配置：${missing.join('、')}`);
  }
  return found;
}

function post(port: Browser.runtime.Port, event: ServerEvent): void {
  port.postMessage(event);
}

async function runStart(port: Browser.runtime.Port, msg: StartTaskMessage): Promise<void> {
  inflight.get(msg.requestId)?.abort();
  const controller = new AbortController();
  inflight.set(msg.requestId, controller);

  const settings = await loadSettings();
  const combination = pickCombination(settings, msg.combinationId);
  const model = pickModel(settings, combination, msg);
  const built = buildPrompt(msg.task, msg.text, settings.translatePrompt, settings.explainPrompt);
  post(port, {
    type: 'meta',
    requestId: msg.requestId,
    sourceLanguage: built.sourceLabel,
    targetLanguage: built.targetLabel,
    modelId: model.id,
    model: model.name,
    providerName: model.providerName,
    combinationId: combination.id,
    combinationName: combination.name,
  });

  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens = 0;
  await chatComplete(
    {
      model,
      userPrompt: built.user,
      stream: settings.streamEnabled,
      thinking: settings.thinkingEnabled,
    },
    {
      onThinking: (delta) => {
        if (!settings.thinkingEnabled) {
          return;
        }
        post(port, { type: 'thinking', requestId: msg.requestId, delta });
      },
      onContent: (delta) => post(port, { type: 'content', requestId: msg.requestId, delta }),
      onUsage: (p, c, cached) => {
        promptTokens = p;
        completionTokens = c;
        cachedTokens = cached;
      },
    },
    controller.signal,
  );

  const snapshot = estimateUsage(model, promptTokens, completionTokens, cachedTokens);
  await appendUsage(
    createUsageRecord(snapshot, {
      combinationId: combination.id,
      combinationName: combination.name,
      modelId: model.id,
      providerName: model.providerName,
      task: msg.task,
      model: model.name,
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
