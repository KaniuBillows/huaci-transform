import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startMockApi, startPageServer } from './mock-api.mjs';

const EXT = fileURLToPath(new URL('../.output/chrome-mv3', import.meta.url));
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
  check('设置页渲染出导航', navCount === 6, `nav=${navCount}`);

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

  // 2.5 配置同步：导出 / 导入字符串（不含用量）
  await options.evaluate(() => {
    const tab = [...document.querySelectorAll('.nav button')].find(
      (el) => el.textContent === '配置同步',
    );
    tab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await options.waitForFunction(
    () => document.querySelector('.main h2')?.textContent === '配置同步',
    { timeout: 5000 },
  );
  await options.click('.sync-export button.primary');
  const exportedText = await options.$eval('.sync-export textarea', (el) => el.value);
  const exported = JSON.parse(exportedText);
  check(
    '导出配置为可识别的配置包',
    exported.app === 'huaci-transform' && exported.kind === 'config' && exported.version === 1,
  );
  check('导出不含用量数据', !exportedText.includes('usage'));

  // 非法字符串给出明确错误
  await options.evaluate((bad) => {
    const input = document.querySelector('.sync-import textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, bad);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, '{oops');
  await options.click('.sync-import button.primary');
  const errText = await options.$eval('.sync-import .error', (el) => el.textContent);
  check('非法字符串有明确错误提示', errText.includes('JSON'), errText);

  // 结构损坏的配置包必须报错，而不是被静默替换成默认设置后覆盖现有配置
  const badPackages = [
    { label: '缺 settings 内容', expect: 'models', pkg: { app: 'huaci-transform', kind: 'config', version: 1, settingsVersion: 4, settings: {} } },
    { label: '模型项为 null', expect: '格式错误', pkg: { app: 'huaci-transform', kind: 'config', version: 1, settingsVersion: 4, settings: { models: [null], combinations: [{}] } } },
  ];
  for (const item of badPackages) {
    const packageText = JSON.stringify(item.pkg);
    await options.evaluate((value) => {
      const input = document.querySelector('.sync-import textarea');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, packageText);
    // 输入变化后预览必须立即撤销，不能被旧预览误导去点“确认导入”
    const stalePreview = await options.$('.sync-import .import-preview');
    check(`改动输入后撤销旧预览（${item.label}）`, stalePreview === null);
    await options.click('.sync-import button.primary');
    const badError = await options.$eval('.sync-import .error', (el) => el.textContent).catch(() => '');
    const noPreview = await options.$('.sync-import .import-preview');
    check(
      `损坏配置包被拒绝并给出错误（${item.label}）`,
      badError.includes(item.expect) && noPreview === null,
      badError,
    );
  }
  const storedAfterBad = await options.evaluate(async () => {
    const data = await chrome.storage.local.get('transform.settings');
    return data['transform.settings'];
  });
  check(
    '损坏配置包未覆盖现有配置',
    Array.isArray(storedAfterBad?.combinations) && storedAfterBad.combinations.length > 0,
  );

  // 内嵌设置版本高于当前插件时必须拒绝，避免归一化丢弃新字段后无法还原
  await options.evaluate(() => {
    const input = document.querySelector('.sync-import textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(
      input,
      JSON.stringify({
        app: 'huaci-transform',
        kind: 'config',
        version: 1,
        settingsVersion: 99,
        settings: { models: [], combinations: [] },
      }),
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await options.click('.sync-import button.primary');
  const versionError = await options.$eval('.sync-import .error', (el) => el.textContent).catch(() => '');
  check('设置 schema 版本过新被拒绝', versionError.includes('升级插件'), versionError);

  // 纯空输入仍保持原有的“解析按钮禁用”行为
  await options.evaluate(() => {
    const input = document.querySelector('.sync-import textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const parseDisabled = await options.$eval('.sync-import button.primary', (el) => el.disabled);
  check('空输入时解析按钮禁用', parseDisabled === true);

  // 先解析可用的包 B 并留下预览，再把输入改成另一个包 A：确认导入不得写入 B
  const bundleB = JSON.stringify({
    app: 'huaci-transform',
    kind: 'config',
    version: 1,
    settingsVersion: 4,
    settings: {
      models: [
        {
          id: 'mock-explain',
          providerId: 'anthropic',
          providerName: 'Anthropic',
          icon: 'anthropic',
          preset: false,
          name: 'Mock Claude',
          model: 'mock-claude',
          baseUrl: api.baseUrl,
          apiKey: 'b-key',
          enabled: true,
          inputPerMillion: 3,
          outputPerMillion: 15,
          cacheInputPerMillion: 0.3,
          currency: 'USD',
        },
      ],
      combinations: [
        {
          id: 'combo-from-b',
          name: 'B 组合',
          translateModelId: 'mock-explain',
          explainModelId: 'mock-explain',
        },
      ],
      defaultCombinationId: 'combo-from-b',
      translatePrompt: 'B 提示词：{{输入内容}}',
    },
  });
  await options.evaluate((value) => {
    const input = document.querySelector('.sync-import textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, bundleB);
  await options.click('.sync-import button.primary');
  await options.waitForSelector('.sync-import .import-preview', { timeout: 5000 });
  // 在预览仍显示时改成结构合法的空组合包：若确认导入沿用了旧 pending 就会写入 B
  await options.evaluate(() => {
    const input = document.querySelector('.sync-import textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, '{"app":"other"}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const previewAfterEdit = await options.$('.sync-import .import-preview');
  check('改动输入后不保留旧预览', previewAfterEdit === null);
  const storedAfterEdit = await options.evaluate(async () => {
    const data = await chrome.storage.local.get('transform.settings');
    return data['transform.settings'];
  });
  check(
    '改动输入后不会写入已解析的旧配置',
    !(storedAfterEdit?.combinations ?? []).some((item) => item.id === 'combo-from-b'),
  );

  // 种一条用量记录，验证导入不会覆盖它
  await options.evaluate(() =>
    chrome.storage.local.set({
      'transform.usage': [
        {
          id: 'seed-usage',
          createdAt: 1,
          combinationId: 'combo',
          combinationName: '种子记录',
          modelId: 'mock-translate',
          providerName: 'OpenAI',
          task: 'translate',
          model: 'mock-luna',
          promptTokens: 1,
          completionTokens: 1,
          cost: 0.01,
          currency: 'USD',
        },
      ],
    }),
  );

  // 合法导入：预览 → 确认 → 覆盖配置且不动用量
  const importPackage = JSON.stringify({
    app: 'huaci-transform',
    kind: 'config',
    version: 1,
    settingsVersion: 4,
    exportedAt: Date.now(),
    settings: {
      models: [
        {
          id: 'mock-translate',
          providerId: 'openai',
          providerName: 'OpenAI',
          icon: 'openai',
          preset: false,
          name: 'Mock Luna',
          model: 'mock-luna',
          baseUrl: api.baseUrl,
          apiKey: 'imported-key',
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
          baseUrl: api.baseUrl,
          apiKey: 'imported-key',
          enabled: true,
          inputPerMillion: 3,
          outputPerMillion: 15,
          cacheInputPerMillion: 0.3,
          currency: 'USD',
        },
      ],
      combinations: [
        {
          id: 'combo-imported',
          name: '导入组合',
          translateModelId: 'mock-translate',
          explainModelId: 'mock-explain',
        },
      ],
      defaultCombinationId: 'combo-imported',
      streamEnabled: true,
      typewriterEnabled: true,
      thinkingEnabled: false,
      thinkingExpandedByDefault: false,
      translatePrompt: '请将这段内容翻译到 {{目标语言}}: {{输入内容}}',
      explainPrompt: '请解释：{{输入内容}}',
    },
  });
  await options.evaluate((pkg) => {
    const input = document.querySelector('.sync-import textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, pkg);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, importPackage);
  await options.click('.sync-import button.primary');
  await options.waitForSelector('.sync-import .import-preview', { timeout: 5000 });
  const preview = await options.$eval('.sync-import .import-preview', (el) => el.textContent);
  // 预览展示的是导入后的模型库总量（配置包模型 + 内置模版模型），
  // 所以只校验格式，随后用真实写入结果核对这个数字是否准确
  const previewCounts = preview.match(/模型：(\d+) 个（其中 (\d+) 个已启用）/);
  check(
    '导入前预览模型与组合概要',
    Boolean(previewCounts) && preview.includes('组合配置：1 个'),
    preview,
  );
  await options.click('.sync-import .import-preview button.primary');
  await options.waitForFunction(
    () => document.querySelector('.sync-import .ok')?.textContent?.includes('已导入'),
    { timeout: 5000 },
  );
  const stored = await options.evaluate(async () => {
    const data = await chrome.storage.local.get('transform.settings');
    return data['transform.settings'];
  });
  check(
    '预览的模型数量与导入结果一致',
    previewCounts !== null &&
      Number(previewCounts[1]) === stored.models?.length &&
      Number(previewCounts[2]) === stored.models?.filter((m) => m.enabled).length,
    `预览=${previewCounts?.[1]}/${previewCounts?.[2]} 实际=${stored.models?.length}/${stored.models?.filter((m) => m.enabled).length}`,
  );
  check(
    '导入覆盖配置且保留 API Key',
    stored.combinations?.[0]?.id === 'combo-imported' &&
      stored.models?.some((m) => m.apiKey === 'imported-key'),
  );
  const usageAfter = await options.evaluate(async () => {
    const data = await chrome.storage.local.get('transform.usage');
    return data['transform.usage'];
  });
  check(
    '导入不写入用量数据',
    Array.isArray(usageAfter) && usageAfter.length === 1 && usageAfter[0]?.id === 'seed-usage',
  );

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

  // 靠近视口底部划词时，结果窗应在安全区域内；长内容只滚动正文
  await web.mouse.click(20, 400);
  await web.evaluate(() => {
    const target = document.querySelector('#t');
    target.style.position = 'fixed';
    target.style.top = '720px';
    target.style.left = '40px';
  });
  await web.evaluate(() => {
    const target = document.querySelector('#t');
    const range = document.createRange();
    range.selectNodeContents(target);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    const rect = target.getBoundingClientRect();
    target.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      clientX: rect.right,
      clientY: rect.top + rect.height / 2,
    }));
  });
  await web.waitForSelector('>>> .tf-toolbar');
  const [bottomTranslateBtn] = await web.$$('>>> .tf-toolbar button');
  await bottomTranslateBtn.click();
  await web.waitForFunction(
    (want) =>
      document.querySelector('huaci-transform')?.shadowRoot?.querySelector('.tf-body')?.textContent?.includes(want),
    { timeout: 20000 },
    api.expected,
  );
  await web.evaluate(() => {
    const body = document.querySelector('huaci-transform')?.shadowRoot?.querySelector('.tf-body');
    body?.append(document.createTextNode(' 很长的翻译结果'.repeat(500)));
  });
  const panelLayout = await web.evaluate(() => {
    const root = document.querySelector('huaci-transform')?.shadowRoot;
    const panel = root?.querySelector('.tf-panel');
    const body = root?.querySelector('.tf-body');
    const rect = panel?.getBoundingClientRect();
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
    return {
      top: rect?.top,
      bottom: rect?.bottom,
      height: rect?.height,
      viewportHeight: window.innerHeight,
      scrollable: body ? body.scrollHeight > body.clientHeight && body.scrollTop > 0 : false,
    };
  });
  check(
    '靠近底部划词时弹窗保留 100px 底边距',
    panelLayout.top >= 12 && panelLayout.bottom <= panelLayout.viewportHeight - 100,
    JSON.stringify(panelLayout),
  );
  check(
    '长翻译结果在最多 480px 的弹窗正文内滚动',
    panelLayout.height <= 480 && panelLayout.scrollable,
    JSON.stringify(panelLayout),
  );
  await web.setViewport({ width: 1280, height: 600 });
  await web.waitForFunction(
    () => document.querySelector('huaci-transform')?.shadowRoot?.querySelector('.tf-panel')?.getBoundingClientRect().bottom <= 500,
    { timeout: 5000 },
  );
  const resizedBottom = await web.evaluate(
    () => document.querySelector('huaci-transform')?.shadowRoot?.querySelector('.tf-panel')?.getBoundingClientRect().bottom,
  );
  check('窗口缩小时弹窗仍保留底边距', resizedBottom <= 500, `bottom=${resizedBottom}`);
} finally {
  await browser.close();
  api.server.close();
  site.server.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
process.exit(failed.length === 0 ? 0 : 1);
