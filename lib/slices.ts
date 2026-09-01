/**
 * 按取值函数求和。
 */
export function sumBy<T>(items: T[], pick: (item: T) => number): number {
  let total = 0;
  for (const item of items) {
    total += pick(item);
  }
  return total;
}

/**
 * 按键分组。
 */
export function groupBy<T>(items: T[], keyOf: (item: T) => string): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyOf(item);
    const bucket = grouped[key];
    if (bucket) {
      bucket.push(item);
    } else {
      grouped[key] = [item];
    }
  }
  return grouped;
}
