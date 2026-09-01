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

  // 2. 验证预置厂商，再写入一组可调用的独立模型与组合
  const providers = await options.$$eval('.provider-head h3', (els) =>
    els.map((el) => el.textContent),
  );
  check(
    '模型库预置主流厂商',
    providers.includes('OpenAI') &&
      providers.includes('Anthropic') &&
      providers.includes('阿里') &&
      providers.includes('豆包') &&
      providers.includes('GLM') &&
      providers.includes('MiniMax') &&
      providers.includes('Kimi'),
    providers.join(','),
  );
  await options.click('.model-card .switch');
  await options.waitForSelector('.model-dialog');
  await options.click('.model-dialog button.primary');
  const validation = await options.$eval('.model-dialog .form-error', (el) => el.textContent);
  check('模型未配置 API Key 时不能启用', validation?.includes('API Key'), validation ?? '');
  await options.click('.model-dialog .icon-close');

  await options.evaluate(() => {
    const card = [...document.querySelectorAll('.provider-card')].find(
      (item) => item.querySelector('h3')?.textContent === 'Anthropic',
    );
    card?.querySelector('.add-model')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await options.waitForFunction(
    () =>
      document.querySelector('.model-dialog header > div > span')?.textContent === 'Anthropic',
    { timeout: 5000 },
  );
  check('预置厂商新增模型沿用厂商名称', true);
  await options.click('.model-dialog .icon-close');

  await options.evaluate(async (baseUrl) => {
    const settings = {
      models: [
        {
          id: 'mock-translate',
          providerId: 'openai',
          providerName: 'OpenAI',
          icon: 'openai',
          preset: false,
          name: 'Mock Luna',
          model: 'mock-luna',
          baseUrl,
          apiKey: 'test-key',
          enabled: true,
          inputPerMillion: 1,
          outputPerMillion: 4,
          cacheInputPerMillion: 0.1,
          currency: 'USD',
        },
        {
          id: 'mock-explain',
          providerId: 'anthropic',
          providerName: 'Anthropic',
          icon: 'anthropic',
          preset: false,
          name: 'Mock Claude',
          model: 'mock-claude',
          baseUrl,
          apiKey: 'test-key',
          enabled: true,
          inputPerMillion: 3,
          outputPerMillion: 15,
          cacheInputPerMillion: 0.3,
          currency: 'USD',
        },
      ],
      combinations: [
        {
          id: 'combo',
          name: 'Luna 翻译 + Claude 解释',
          translateModelId: 'mock-translate',
          explainModelId: 'mock-explain',
        },
      ],
      defaultCombinationId: 'combo',
      streamEnabled: true,
      typewriterEnabled: true,
      thinkingEnabled: false,
      thinkingExpandedByDefault: false,
      translatePrompt: '请将这段内容翻译到 {{目标语言}}: {{输入内容}}',
      explainPrompt: '请解释：{{输入内容}}',
    };
    await chrome.storage.local.set({ 'transform.settings': settings });
  }, api.baseUrl);
  check('独立模型和跨厂商组合写入本地存储', true);

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

  const modelOptions = await web.$$eval(
    '>>> .tf-select option',
    (els) => els.map((el) => el.textContent),
  );
  check(
    '悬浮窗可直接切换独立模型',
    modelOptions.includes('Mock Luna') && modelOptions.includes('Mock Claude'),
    modelOptions.join(','),
  );

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
