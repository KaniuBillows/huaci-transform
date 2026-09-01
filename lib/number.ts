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
 * 按百万 token 单价计算费用，缓存命中部分使用缓存单价。
 */
export function calcTokenCost(
  promptTokens: number,
  completionTokens: number,
  inputPerMillion: number,
  outputPerMillion: number,
  cachedTokens = 0,
  cacheInputPerMillion = 0,
): number {
  const cached = Math.min(toNonNegative(cachedTokens), toNonNegative(promptTokens));
  const fresh = toNonNegative(promptTokens) - cached;
  const input =
    (fresh / 1_000_000) * toNonNegative(inputPerMillion) +
    (cached / 1_000_000) * toNonNegative(cacheInputPerMillion);
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
 * 解析用户输入的单价；允许空串与中间态小数点，非法时返回 null。
 */
export function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '.') {
    return 0;
  }
  if (!/^\d*\.?\d*$/.test(trimmed)) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

/**
 * 将单价格式化为可继续编辑的字符串。
 */
export function formatPriceInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return '0';
  }
  return String(value);
}

/**
 * 解析用户输入的数字，失败时返回 0。
 */
export function parseNumber(raw: string): number {
  return parsePriceInput(raw) ?? 0;
}
