import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '划词译',
    description: '划词翻译与解释，兼容 OpenAI 接口，支持多配置与本地计费。',
    permissions: ['storage', 'clipboardWrite'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: '划词译',
    },
  },
});
