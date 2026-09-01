import { describe, expect, it } from 'vitest';
import { detectPrimaryLanguage, resolveTargetLanguage } from '../lib/language';
import { buildPrompt, DEFAULT_TRANSLATE_PROMPT } from '../lib/prompts';
import { applyTemplate } from '../lib/strings';
import { calcTokenCost } from '../lib/number';

describe('detectPrimaryLanguage', () => {
  it('detects Chinese', () => {
    expect(detectPrimaryLanguage('这是一段中文内容')).toBe('zh');
  });

  it('detects Latin as non-Chinese', () => {
    expect(detectPrimaryLanguage('This is an English paragraph.')).toBe('en');
  });
});

describe('resolveTargetLanguage', () => {
  it('translates Chinese to English', () => {
    expect(resolveTargetLanguage('你好世界').targetLabel).toBe('英文');
  });

  it('translates non-Chinese to Chinese', () => {
    expect(resolveTargetLanguage('Hello world').targetLabel).toBe('中文');
  });
});

describe('buildPrompt', () => {
  it('fills translate template', () => {
    const built = buildPrompt('translate', 'Hello', DEFAULT_TRANSLATE_PROMPT, '');
    expect(built.user).toBe('请将这段内容翻译到 中文: Hello');
  });
});

describe('applyTemplate', () => {
  it('replaces placeholders', () => {
    expect(applyTemplate('A {{x}}', { x: '1' })).toBe('A 1');
  });
});

describe('calcTokenCost', () => {
  it('computes million-token price', () => {
    expect(calcTokenCost(1_000_000, 500_000, 2, 8)).toBe(6);
  });

  it('uses cache price for cached prompt tokens', () => {
    expect(calcTokenCost(1_000_000, 0, 2, 8, 250_000, 0.2)).toBe(1.55);
  });
});

describe('parsePriceInput', () => {
  it('accepts leading decimal values', async () => {
    const { parsePriceInput } = await import('./number');
    expect(parsePriceInput('0.15')).toBe(0.15);
    expect(parsePriceInput('0.')).toBe(0);
    expect(parsePriceInput('.5')).toBe(0.5);
  });
});
