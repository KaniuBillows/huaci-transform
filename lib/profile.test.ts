import { describe, expect, it } from 'vitest';
import { defaultModelFor, formatModelList, parseModelList, profileModels } from '../lib/profile';
import type { ApiProfile } from '../lib/types';

function profile(patch: Partial<ApiProfile> = {}): ApiProfile {
  return {
    id: 'p',
    name: 'n',
    baseUrl: 'https://x/v1',
    apiKey: 'k',
    translateModel: 'a',
    explainModel: 'b',
    models: [],
    ...patch,
  };
}

describe('profileModels', () => {
  it('includes task defaults without duplicates', () => {
    expect(profileModels(profile({ models: ['a', 'c'] }))).toEqual(['a', 'c', 'b']);
  });

  it('drops blanks', () => {
    expect(profileModels(profile({ models: ['', ' '], explainModel: '' }))).toEqual(['a']);
  });
});

describe('parseModelList', () => {
  it('splits on newlines and commas and dedupes', () => {
    expect(parseModelList('a\n b ,a\n\n c')).toEqual(['a', 'b', 'c']);
  });
});

describe('formatModelList', () => {
  it('round-trips with parse', () => {
    const models = ['a', 'b'];
    expect(parseModelList(formatModelList(models))).toEqual(models);
  });
});

describe('defaultModelFor', () => {
  it('picks per task', () => {
    expect(defaultModelFor(profile(), 'translate')).toBe('a');
    expect(defaultModelFor(profile(), 'explain')).toBe('b');
  });

  it('falls back when task model is empty', () => {
    expect(defaultModelFor(profile({ explainModel: '' }), 'explain')).toBe('a');
  });
});
