import { resolveTargetLanguage } from './language';
import { applyTemplate } from './strings';
import type { TaskKind } from './types';

export const DEFAULT_TRANSLATE_PROMPT = '请将这段内容翻译到 {{目标语言}}: {{输入内容}}';
export const DEFAULT_EXPLAIN_PROMPT = '请用简洁准确的中文解释下面这段内容：\n{{输入内容}}';

export interface BuiltPrompt {
  user: string;
  sourceLabel: string;
  targetLabel: string;
}

/**
 * 用本地语言检测结果填充模版，不把语种判断交给模型。
 */
export function buildPrompt(
  task: TaskKind,
  text: string,
  translateTemplate: string,
  explainTemplate: string,
): BuiltPrompt {
  const pair = resolveTargetLanguage(text);
  if (task === 'explain') {
    return {
      user: applyTemplate(explainTemplate, {
        目标语言: pair.targetLabel,
        输入内容: text,
      }),
      sourceLabel: pair.sourceLabel,
      targetLabel: pair.targetLabel,
    };
  }
  return {
    user: applyTemplate(translateTemplate, {
      目标语言: pair.targetLabel,
      输入内容: text,
    }),
    sourceLabel: pair.sourceLabel,
    targetLabel: pair.targetLabel,
  };
}
