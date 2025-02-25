import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import commonjs from '@rollup/plugin-commonjs';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vueJsx from '@vitejs/plugin-vue-jsx';

export default ({ mode }) => {
  const { VITE_PORT, VITE_BASE_URL, VITE_PROXY_DOMAIN, VITE_PROXY_DOMAIN_REAL } = loadEnv(mode, process.cwd());

  return defineConfig({
    base: VITE_BASE_URL,
    plugins: [
      vue(),
      commonjs(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        resolvers: [
          ElementPlusResolver(),
          // 自动导入图标组件
          IconsResolver({
            prefix: 'Icon',
          }),
        ],
        eslintrc: {
          enabled: true,
        },
        dts: true,
      }),
      Components({
        resolvers: [
          ElementPlusResolver(),
          IconsResolver({
            enabledCollections: ['ep'],
          }),
        ],
      }),
      Icons({
        autoInstall: true,
      }),
      nodePolyfills({
        // sharedb使用了events模块，需要polyfill
        include: ['events'],
      }),
      vueJsx(),
    ],
    test: {
      environment: 'jsdom',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            hack: `true; @import (reference) "${resolve('src/style/variables.less')}";`,
          },
          math: 'strict',
          javascriptEnabled: true,
        },
      },
    },
    optimizeDeps: {
      include: ['mitt', 'dayjs', 'axios', 'pinia', '@vueuse/core', 'sharedb'],
      exclude: ['@iconify-icons/lets-icons'],
    },
    server: {
      port: VITE_PORT,
      host: '0.0.0.0',
      open: true,
      proxy: {
        [VITE_PROXY_DOMAIN]: {
          target: VITE_PROXY_DOMAIN_REAL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''), // 重写路径
        },
      },
      // // 端口号
      // port: VITE_PORT,
      // // 监听所有地址
      // host: '0.0.0.0',
      // // 服务启动时是否自动打开浏览器
      // open: true,
      // // 允许跨域
      // cors: true,
      // // 自定义代理规则
      // proxy: {},
      // // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长并防止转换瀑布
      // warmup: {
      //   clientFiles: ['./index.html', './src/{views,components}/*'],
      // },
    },
    build: {
      // 设置最终构建的浏览器兼容目标
      target: 'es2015',
      // 构建后是否生成 source map 文件
      sourcemap: false,
      //  chunk 大小警告的限制（以 kbs 为单位）
      chunkSizeWarningLimit: 2000,
      // 启用/禁用 gzip 压缩大小报告
      reportCompressedSize: false,
      // 自定义底层的 Rollup 打包配置
      rollupOptions: {
        output: {
          // 指定 chunks 的入口文件模式
          entryFileNames: 'static/js/[name]-[hash].js',
          // 对代码分割中产生的 chunk 自定义命名
          chunkFileNames: 'static/js/[name]-[hash].js',
          // 自定义构建结果中的静态资源名称
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          // 压缩 Rollup 产生的额外代码
          compact: true,
          // 创建自定义的公共 chunk
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
          },
        },
      },
    },
  });
};
