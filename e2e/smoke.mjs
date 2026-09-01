import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { startMockApi, startPageServer } from './mock-api.mjs';

const EXT = new URL('../.output/chrome-mv3', import.meta.url).pathname;
const CHROME = process.env.CHROME_PATH;

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

if (!CHROME || !existsSync(CHROME)) {
  console.error('需要 CHROME_PATH 指向 Chrome for Testing：npx @puppeteer/browsers install chrome@stable');
  process.exit(2);
}
if (!existsSync(EXT)) {
  console.error('缺少构建产物，请先执行 npm run build');
  process.exit(2);
}

/** 用原生 setter 赋值，保证 React 受控组件能收到 change。 */
const REACT_SET = (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

const api = await startMockApi();
const site = await startPageServer();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 20000,
  defaultViewport: { width: 1280, height: 800 },
  userDataDir: mkdtempSync(join(tmpdir(), 'huaci-e2e-')),
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
  ],
});

try {
  const sw = await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 15000 });
  const extId = new URL(sw.url()).host;

  // 1. popup 的“打开设置”必须真的打开 options.html 页面
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: 'domcontentloaded' });
  await popup.waitForSelector('button');
  // 新标签抢占焦点后 popup 渲染进程会被冻结，click 的收尾探测可能超时，与插件无关
  await popup.click('button').catch(() => {});
  const optionsTarget = await browser
    .waitForTarget((t) => t.type() === 'page' && t.url().endsWith('/options.html'), { timeout: 10000 })
    .catch(() => null);
  check('popup 点击“打开设置”打开设置页', Boolean(optionsTarget));
  if (!optionsTarget) {
    throw new Error('设置页未打开');
  }

  const options = await optionsTarget.page();
  await options.bringToFront();
  await options.waitForSelector('.nav button');
  const navCount = await options.$$eval('.nav button', (els) => els.length);
  check('设置页渲染出导航', navCount === 5, `nav=${navCount}`);

  // 2. 在设置页填配置，验证落盘
  await options.evaluate(
    (setValue, baseUrl) => {
      const byLabel = (text) =>
        [...document.querySelectorAll('.row')]
          .find((r) => r.querySelector('.label')?.textContent?.trim() === text)
          ?.querySelector('input');
      const set = new Function('el', 'value', `(${setValue})(el, value)`);
      set(byLabel('Base URL'), baseUrl);
      set(byLabel('API Key'), 'test-key');
      set(byLabel('翻译模型'), 'mock-model');
    },
    REACT_SET.toString(),
    api.baseUrl,
  );
  const stored = await options.waitForFunction(
    (url) =>
      new Promise((resolve) => {
        chrome.storage.local.get('transform.settings', (d) => {
          const p = d['transform.settings']?.profiles?.[0];
          resolve(p?.baseUrl === url && p?.apiKey === 'test-key' && p?.translateModel === 'mock-model');
        });
      }),
    { timeout: 8000 },
    api.baseUrl,
  ).then(() => true).catch(() => false);
  check('设置写入 chrome.storage.local', stored);

  // 3. 网页里划词 → 工具条 → 翻译结果
  const web = await browser.newPage();
  await web.bringToFront();
  await web.goto(site.url, { waitUntil: 'domcontentloaded' });
  await web.waitForSelector('huaci-transform', { timeout: 8000 });
  check('内容脚本注入页面', true);

  const box = await web.$eval('#t', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await web.mouse.move(box.x + 2, box.y + box.h / 2);
  await web.mouse.down();
  await web.mouse.move(box.x + box.w, box.y + box.h / 2, { steps: 8 });
  await web.mouse.up();

  await web.waitForSelector('>>> .tf-toolbar', { timeout: 8000 });
  const labels = await web.$$eval('>>> .tf-toolbar button', (els) => els.map((e) => e.textContent));
  check('划词后出现翻译与解释按钮', labels.join(',') === '翻译,解释', labels.join(','));

  const [translateBtn] = await web.$$('>>> .tf-toolbar button');
  await translateBtn.click();

  const gotResult = await web
    .waitForFunction(
      (want) =>
        document
          .querySelector('huaci-transform')
          ?.shadowRoot?.querySelector('.tf-body')
          ?.textContent?.includes(want),
      { timeout: 20000 },
      api.expected,
    )
    .then(() => true)
    .catch(() => false);
  check('悬浮窗展示流式翻译结果', gotResult);

  const meta = await web.evaluate(
    () =>
      document.querySelector('huaci-transform')?.shadowRoot?.querySelector('.tf-meta')?.textContent ?? '',
  );
  check('本地语种检测得出英文→中文', meta.includes('英文 → 中文'), meta);

  const gotUsage = await web
    .waitForFunction(
      () =>
        document
          .querySelector('huaci-transform')
          ?.shadowRoot?.querySelector('.tf-foot')
          ?.textContent?.includes('tokens'),
      { timeout: 10000 },
    )
    .then(() => true)
    .catch(() => false);
  check('用量统计写入页脚', gotUsage);
} finally {
  await browser.close();
  api.server.close();
  site.server.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
process.exit(failed.length === 0 ? 0 : 1);
