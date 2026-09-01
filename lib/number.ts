/**
 * 将非法数字规整为 0。
 */
export function toNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

/**
 * 按百万 token 单价计算费用。
 */
export function calcTokenCost(
  promptTokens: number,
  completionTokens: number,
  inputPerMillion: number,
  outputPerMillion: number,
): number {
  const input = (toNonNegative(promptTokens) / 1_000_000) * toNonNegative(inputPerMillion);
  const output = (toNonNegative(completionTokens) / 1_000_000) * toNonNegative(outputPerMillion);
  return input + output;
}

/**
 * 格式化金额，保留最多 6 位小数并去掉末尾 0。
 */
export function formatMoney(amount: number, currency: string): string {
  const safe = toNonNegative(amount);
  const body = safe.toFixed(6).replace(/\.?0+$/, '');
  const prefix = currency === 'USD' ? '$' : '¥';
  return `${prefix}${body === '' ? '0' : body}`;
}

/**
 * 解析用户输入的数字，失败时返回 0。
 */
export function parseNumber(raw: string): number {
  const n = Number(raw);
  return toNonNegative(n);
}
