import type { ApiProfile } from './types';

/**
 * 配置可选的模型列表，始终包含翻译与解释的默认模型。
 */
export function profileModels(profile: ApiProfile): string[] {
  const all = [...(profile.models ?? []), profile.translateModel, profile.explainModel];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const model of all) {
    const name = model?.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * 解析用户按行填写的模型列表。
 */
export function parseModelList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of raw.split(/[\n,]/)) {
    const name = line.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * 按行展示模型列表，供文本域编辑。
 */
export function formatModelList(models: string[]): string {
  return models.join('\n');
}

/**
 * 取任务对应的默认模型。
 */
export function defaultModelFor(profile: ApiProfile, task: 'translate' | 'explain'): string {
  const primary = task === 'explain' ? profile.explainModel : profile.translateModel;
  const fallback = task === 'explain' ? profile.translateModel : profile.explainModel;
  return primary?.trim() || fallback?.trim() || profileModels(profile)[0] || '';
}
