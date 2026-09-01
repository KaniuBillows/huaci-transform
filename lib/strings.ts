/**
 * 按 {{键}} 替换模版字符串，未匹配的占位符保留为空。
 */
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const value = vars[key.trim()];
    return value === undefined ? '' : value;
  });
}

/**
 * 去掉首尾空白；空串返回 fallback。
 */
export function nonempty(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length === 0 ? fallback : trimmed;
}

/**
 * 截断过长文本，保留开头。
 */
export function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}…`;
}
