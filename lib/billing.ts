import { calcTokenCost } from './number';
import type { AppSettings, Currency, ModelPrice, TaskKind, UsageRecord } from './types';

function matchPrice(prices: ModelPrice[], model: string): ModelPrice | undefined {
  const exact = prices.find((p) => p.model === model);
  if (exact) {
    return exact;
  }
  return prices.find((p) => model.startsWith(p.model) || p.model.startsWith(model));
}

export interface UsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  cost: number;
  currency: Currency;
}

/**
 * 按配置单价估算一次调用费用。
 */
export function estimateUsage(
  settings: AppSettings,
  model: string,
  promptTokens: number,
  completionTokens: number,
): UsageSnapshot {
  const price = matchPrice(settings.prices, model);
  const currency: Currency = price?.currency ?? 'CNY';
  const cost = price
    ? calcTokenCost(
        promptTokens,
        completionTokens,
        price.inputPerMillion,
        price.outputPerMillion,
      )
    : 0;
  return { promptTokens, completionTokens, cost, currency };
}

/**
 * 生成本地用量记录。
 */
export function createUsageRecord(
  snapshot: UsageSnapshot,
  meta: {
    profileId: string;
    profileName: string;
    task: TaskKind;
    model: string;
  },
): UsageRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    profileId: meta.profileId,
    profileName: meta.profileName,
    task: meta.task,
    model: meta.model,
    promptTokens: snapshot.promptTokens,
    completionTokens: snapshot.completionTokens,
    cost: snapshot.cost,
    currency: snapshot.currency,
  };
}
