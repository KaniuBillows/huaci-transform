/**
 * 打开设置页。openOptionsPage 在部分场景下会静默失败，回退到直接开标签页。
 */
export async function openOptionsPage(): Promise<void> {
  const url = browser.runtime.getURL('/options.html');
  try {
    await browser.tabs.create({ url });
  } catch {
    await browser.runtime.openOptionsPage();
  }
}
