import { describe, expect, it } from 'vitest';
import { mountAnchor, remountIfDetached } from './keep-mounted';

interface FakeAnchor {
  appended: unknown[];
  append(child: unknown): void;
}

function anchor(): FakeAnchor {
  const appended: unknown[] = [];
  return {
    appended,
    append(child) {
      appended.push(child);
    },
  };
}

function host(connected: boolean): Element {
  return { isConnected: connected } as unknown as Element;
}

function doc(body: FakeAnchor | null, documentElement: FakeAnchor | null = null): Document {
  return { body, documentElement } as unknown as Document;
}

describe('mountAnchor', () => {
  it('优先使用 body', () => {
    const body = anchor();
    const html = anchor();
    expect(mountAnchor(doc(body, html))).toBe(body);
  });

  it('没有 body 时退回 documentElement', () => {
    const html = anchor();
    expect(mountAnchor(doc(null, html))).toBe(html);
  });
});

describe('remountIfDetached', () => {
  it('宿主仍在文档中时不重复挂载', () => {
    const body = anchor();
    expect(remountIfDetached(host(true), doc(body))).toBe(false);
    expect(body.appended).toHaveLength(0);
  });

  it('站点换掉 body 后把宿主挂回新 body', () => {
    const body = anchor();
    const element = host(false);
    expect(remountIfDetached(element, doc(body))).toBe(true);
    expect(body.appended).toEqual([element]);
  });

  it('没有可用挂载点时不做任何事', () => {
    expect(remountIfDetached(host(false), doc(null, null))).toBe(false);
  });
});
