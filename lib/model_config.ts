import type { AppSettings, ModelCombination, ModelConfig, TaskKind } from './types';

/** 返回已启用且配置完整的模型。 */
export function enabledModels(settings: AppSettings): ModelConfig[] {
  return settings.models.filter((model) => model.enabled && validateModel(model).length === 0);
}

/** 校验模型启用所需字段。 */
export function validateModel(model: ModelConfig): string[] {
  const errors: string[] = [];
  if (model.name.trim() === '') {
    errors.push('名称');
  }
  if (model.model.trim() === '') {
    errors.push('模型 ID');
  }
  if (model.baseUrl.trim() === '') {
    errors.push('Base URL');
  }
  if (model.apiKey.trim() === '') {
    errors.push('API Key');
  }
  if (model.inputPerMillion < 0 || !Number.isFinite(model.inputPerMillion)) {
    errors.push('输入单价');
  }
  if (model.outputPerMillion < 0 || !Number.isFinite(model.outputPerMillion)) {
    errors.push('输出单价');
  }
  return errors;
}

/** 获取默认组合。 */
export function defaultCombination(settings: AppSettings): ModelCombination | undefined {
  return (
    settings.combinations.find((item) => item.id === settings.defaultCombinationId) ??
    settings.combinations[0]
  );
}

/** 获取组合中某任务对应的模型。 */
export function modelForTask(
  settings: AppSettings,
  combination: ModelCombination,
  task: TaskKind,
): ModelConfig | undefined {
  const modelId =
    task === 'translate' ? combination.translateModelId : combination.explainModelId;
  return settings.models.find((model) => model.id === modelId && model.enabled);
}

/** 组合是否同时引用了两个可用模型。 */
export function isCombinationReady(
  settings: AppSettings,
  combination: ModelCombination,
): boolean {
  return Boolean(
    modelForTask(settings, combination, 'translate') &&
      modelForTask(settings, combination, 'explain'),
  );
}
