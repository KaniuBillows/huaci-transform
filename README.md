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
- 配置同步：设置页可把全部配置（含 API Key）导出为字符串，在其他电脑 / 浏览器导入即可恢复；**不含**用量统计

## 配置同步

设置页 → 「配置同步」：

- **导出**：生成一段带版本号的 JSON 配置字符串，一键复制。包含 API Key、模型库、组合配置、行为设置与提示词模板
- **导入**：粘贴字符串后先解析校验并预览概要（模型数、组合数、是否含 Key），确认后覆盖当前配置
- 导入**不会**写入或覆盖用量统计 / 费用记录
- 非法字符串会给出明确错误提示

> 说明：`chrome.storage.local` 会在插件卸载时被浏览器清空（这是浏览器安全设计，无法绕过）。跨设备 / 重装后恢复配置请使用导出字符串，自行保存到剪贴板或文件。

## 开发

```bash
npm install
npm test
npm run dev
```

`npm run dev` 会启动 WXT，并加载 Chrome 扩展开发实例。

端到端冒烟测试会真实加载扩展，覆盖「打开设置 → 保存配置 → 配置同步导出/导入 → 划词翻译 → 计费」：

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

PR 合并进 `main` 后也会自动发版：`auto-tag.yml` 在合并提交上打一个补丁 tag（`vX.Y.Z` → `vX.Y.(Z+1)`），并直接复用 `release.yml` 构建 zip、创建 Release，构建产物里的版本号会跟随 tag。想跳过发版，给 PR 加 `skip-release` 标签即可。

> 用仓库自带的 `GITHUB_TOKEN` 推 tag 不会触发 `push` 事件（GitHub 的既定行为），所以自动发版是**直接调用** `release.yml`，而不是靠 tag 触发。若哪次只打上了 tag 却没出 Release，删掉远端 tag 再用自己的凭据重推一次即可补发。

## 技术栈

[WXT](https://wxt.dev) + React + TypeScript，Manifest V3。
