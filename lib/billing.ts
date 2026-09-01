import { calcTokenCost, formatMoney } from './number';
import type { Currency, ModelConfig, TaskKind, UsageRecord } from './types';

export interface UsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  cost: number;
  currency: Currency;
}

/** 按货币分别汇总费用，避免人民币和美元直接相加。 */
export function sumCosts(records: UsageRecord[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { CNY: 0, USD: 0 };
  for (const record of records) {
    totals[record.currency] += record.cost;
  }
  return totals;
}

/** 以各自币种展示费用汇总。 */
export function formatCostSummary(records: UsageRecord[]): string {
  const totals = sumCosts(records);
  const parts: string[] = [];
  if (totals.CNY > 0) {
    parts.push(formatMoney(totals.CNY, 'CNY'));
  }
  if (totals.USD > 0) {
    parts.push(formatMoney(totals.USD, 'USD'));
  }
  return parts.length > 0 ? parts.join(' + ') : '¥0';
}

/**
 * 按配置单价估算一次调用费用。
 */
export function estimateUsage(
  model: ModelConfig,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0,
): UsageSnapshot {
  const currency = model.currency;
  const cost = calcTokenCost(
    promptTokens,
    completionTokens,
    model.inputPerMillion,
    model.outputPerMillion,
    cachedTokens,
    model.cacheInputPerMillion,
  );
  return { promptTokens, completionTokens, cost, currency };
}

/**
 * 生成本地用量记录。
 */
export function createUsageRecord(
  snapshot: UsageSnapshot,
  meta: {
    combinationId: string;
    combinationName: string;
    modelId: string;
    providerName: string;
    task: TaskKind;
    model: string;
  },
): UsageRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    combinationId: meta.combinationId,
    combinationName: meta.combinationName,
    modelId: meta.modelId,
    providerName: meta.providerName,
    task: meta.task,
    model: meta.model,
    promptTokens: snapshot.promptTokens,
    completionTokens: snapshot.completionTokens,
    cost: snapshot.cost,
    currency: snapshot.currency,
  };
}
