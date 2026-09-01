/** 扩展是否仍可被当前页面的 content script 调用。 */
export function isExtensionAlive(): boolean {
  try {
    return Boolean(browser.runtime?.id);
  } catch {
    return false;
  }
}

/** 扩展热更新后旧页面脚本失效时的提示。 */
export const CONTEXT_INVALIDATED_HINT =
  '扩展已更新或重新加载，请刷新当前页面后再试';
