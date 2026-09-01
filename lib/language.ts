const HAN = /\p{Script=Han}/u;
const LATIN = /\p{Script=Latin}/u;
const LETTER = /\p{L}/u;
const HAN_RATIO_ZH = 0.3;

export interface LanguagePair {
  sourceCode: 'zh' | 'en' | 'other';
  sourceLabel: string;
  targetLabel: string;
}

function isLetter(ch: string): boolean {
  return LETTER.test(ch);
}

/**
 * 在本地用 Unicode 文字系统统计主语言，不调用模型。
 */
export function detectPrimaryLanguage(text: string): LanguagePair['sourceCode'] {
  const letters = [...text].filter(isLetter);
  if (letters.length === 0) {
    return 'other';
  }
  let han = 0;
  let latin = 0;
  for (const ch of letters) {
    if (HAN.test(ch)) {
      han += 1;
    } else if (LATIN.test(ch)) {
      latin += 1;
    }
  }
  if (han / letters.length >= HAN_RATIO_ZH) {
    return 'zh';
  }
  if (latin / letters.length >= HAN_RATIO_ZH) {
    return 'en';
  }
  return 'other';
}

/**
 * 中文译英，非中文译中。
 */
export function resolveTargetLanguage(text: string): LanguagePair {
  const sourceCode = detectPrimaryLanguage(text);
  if (sourceCode === 'zh') {
    return { sourceCode, sourceLabel: '中文', targetLabel: '英文' };
  }
  const sourceLabel = sourceCode === 'en' ? '英文' : '其他';
  return { sourceCode, sourceLabel, targetLabel: '中文' };
}
