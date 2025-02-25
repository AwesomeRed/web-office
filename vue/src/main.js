import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import store from './store';

// 引入组件库全局样式资源
import 'element-plus/dist/index.css';

import '@/assets/main.css';
import '@/style/index.less';

const app = createApp(App);
// 注册图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
app
  .use(ElementPlus, {
    locale: zhCn,
  })
  .use(router)
  .use(store)
  .mount('#app');
