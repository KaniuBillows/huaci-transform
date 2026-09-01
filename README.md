# 划词译

Chrome 划词翻译 / 解释插件。划选文本后在鼠标旁出现按钮，调用 OpenAI 兼容接口，结果在悬浮窗中展示。

## 功能

- 划词出现「翻译」「解释」按钮，结果在附近悬浮窗展示
- 兼容 OpenAI Chat Completions，支持 stream、逐字展示、深度思考（`enable_thinking`）
- 多套第三方 API 配置，设置页指定默认，悬浮窗可即时切换
- 解释可配置与翻译不同的模型
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

生产构建：

```bash
npm run build   # 输出 .output/chrome-mv3
npm run zip     # 打包 zip，供 Release 下载
```

手动安装：打开 `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序，选择 `.output/chrome-mv3`。

## 发布

推送形如 `v0.1.0` 的 tag 后，GitHub Actions 会构建 Chrome 插件 zip，并挂到该 tag 的 Release 上，可直接下载。

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 技术栈

[WXT](https://wxt.dev) + React + TypeScript，Manifest V3。
