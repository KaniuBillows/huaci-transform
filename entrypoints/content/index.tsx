import ReactDOM from 'react-dom/client';
import { keepUiMounted } from '../../lib/keep-mounted';
import { ContentApp } from './App';
import './style.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'huaci-transform',
      position: 'overlay',
      zIndex: 2147483646,
      isolateEvents: true,
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<ContentApp />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
    // 客户端路由换掉 <body> 时界面会被一起摘掉，这里负责挂回；
    // 扩展失效时 WXT 会先移除界面，随后这里停掉监听，避免把死掉的界面挂回来
    const stopKeepingMounted = keepUiMounted(ui.shadowHost);
    ctx.onInvalidated(stopKeepingMounted);
  },
});
