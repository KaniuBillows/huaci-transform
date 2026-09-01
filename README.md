# 划词译

Chrome 划词翻译 / 解释插件。划选文本后在鼠标旁出现按钮，调用 OpenAI 兼容接口，结果在悬浮窗中展示。

## 功能

- 划词出现「翻译」「解释」按钮，结果在附近悬浮窗展示；点击别处或按 Esc 收起
- 兼容 OpenAI Chat Completions，支持 stream、逐字展示、深度思考（`enable_thinking`）
- 独立模型库：每个模型单独配置厂商、Base URL、API Key、启用状态和百万 token 单价
- 预置 OpenAI、Anthropic、Google Gemini、DeepSeek、阿里云百炼、Moonshot AI 和 xAI 的主流模型与品牌图标
- 每个预置厂商可继续添加自定义模型，也可添加使用默认图标的自定义厂商
- 组合配置将翻译和解释模型自由搭配，例如 OpenAI 翻译、Claude 解释
- 悬浮窗下拉可在所有已启用模型之间直接切换重跑
- 翻译目标语言由**本地 Unicode 文字系统检测**决定：中文 → 英文，非中文 → 中文
- 提示词模版：`请将这段内容翻译到 {{目标语言}}: {{输入内容}}`
- 用量与费用仅存 `chrome.storage.local`

## 开发

```bash
npm install
npm test
npm run dev
```

`npm run dev` 会启动 WXT，并加载 Chrome 扩展开发实例。

端到端冒烟测试会真实加载扩展，覆盖「打开设置 → 保存配置 → 划词翻译 → 计费」：

```bash
npx @puppeteer/browsers install chrome@stable   # 首次
CHROME_PATH=<上一步输出的路径> npm run e2e
```

生产构建：

```bash
npm run build   # 输出 .output/chrome-mv3
npm run zip     # 打包 zip，供 Release 下载
```

手动安装：打开 `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序，选择 `.output/chrome-mv3`。

## 发布

推送形如 `v0.2.0` 的 tag 后，GitHub Actions 会构建 Chrome 插件 zip，并挂到该 tag 的 Release 上，可直接下载。

```bash
git tag v0.2.0
git push origin v0.2.0
```

## 技术栈

[WXT](https://wxt.dev) + React + TypeScript，Manifest V3。
