/**
 * 保住内容脚本界面：宿主元素掉线时重新挂回文档。
 *
 * Next.js / Turbo / Astro 这类站点在客户端路由时会整体替换 `<body>`（而不是就地改内容），
 * 挂在 body 上的宿主元素会跟着被移除。此时内容脚本仍然存活、划词事件也照常触发，
 * 但界面已经不在文档里，用户看到的现象就是「划词不出按钮，刷新页面才恢复」。
 */

/** 宿主元素的挂载点：优先 body，其次是 documentElement。 */
export function mountAnchor(doc: Document): Element | null {
  return doc.body ?? doc.documentElement ?? null;
}

/**
 * 宿主已不在文档中时重新挂回挂载点。
 *
 * @returns 是否执行了重新挂载。
 */
export function remountIfDetached(host: Element, doc: Document): boolean {
  if (host.isConnected) {
    return false;
  }
  const anchor = mountAnchor(doc);
  if (!anchor) {
    return false;
  }
  anchor.append(host);
  return true;
}

/**
 * 监听文档结构变化，宿主被站点移除时自动挂回。
 *
 * 除了监听 `document` / `<html>` / `<body>` 的直接子节点变化，也在划词相关事件前兜底检查一次：
 * 站点有可能在同一个事件处理流程里换掉 body，等不到 MutationObserver 的回调。
 *
 * @returns 停止监听并解绑事件。
 */
export function keepUiMounted(host: Element, doc: Document = document): () => void {
  let watchedHtml: Element | null = null;
  let watchedBody: Element | null = null;

  const observeCurrentTree = () => {
    if (watchedHtml === doc.documentElement && watchedBody === doc.body) {
      return;
    }
    observer.disconnect();
    watchedHtml = doc.documentElement;
    watchedBody = doc.body;
    observer.observe(doc, { childList: true });
    if (watchedHtml) {
      observer.observe(watchedHtml, { childList: true });
    }
    if (watchedBody) {
      observer.observe(watchedBody, { childList: true });
    }
  };

  const ensureMounted = () => {
    observeCurrentTree();
    remountIfDetached(host, doc);
  };

  const events = ['mouseup', 'pointerup', 'keyup', 'selectionchange'] as const;

  const observer = new MutationObserver(ensureMounted);
  observeCurrentTree();
  for (const type of events) {
    doc.addEventListener(type, ensureMounted, true);
  }

  return () => {
    observer.disconnect();
    for (const type of events) {
      doc.removeEventListener(type, ensureMounted, true);
    }
  };
}
