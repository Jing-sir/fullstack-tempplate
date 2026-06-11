import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv } from 'vite'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8800/'

    return {
        base: env.VITE_PUBLIC_PATH || '/',
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        css: {
            postcss: {
                plugins: [tailwindcss(), autoprefixer()],
            },
            preprocessorOptions: {
                less: {
                    modifyVars: { 'color-primary-6': 'var(--color-primary-6)' },
                    javascriptEnabled: true,
                },
            },
        },
        plugins: [
            vue(),
            AutoImport({
                imports: ['vue', 'vue-router', 'vue-i18n', 'pinia'],
                dirs: ['./src/store', './src/utils', './src/use'],
                dts: 'src/auto-imports.d.ts',
            }),
            Components({
                globs: [
                    'src/components/**/*.vue',
                    '!src/components/TableSearchWrap/SearchWrap/Index.vue',
                ],
                dts: 'src/components.d.ts',
                resolvers: [
                    ArcoResolver({
                        importStyle: 'less',
                    }),
                ],
            }),
        ],
        define: {
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
        },
        server: {
            port: 60001,
            proxy: {
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (
                            id.includes('node_modules/echarts/lib/chart') ||
                            id.includes('node_modules/echarts/charts')
                        ) {
                            return 'vendor-echarts-charts'
                        }
                        if (
                            id.includes('node_modules/echarts/lib/component') ||
                            id.includes('node_modules/echarts/components')
                        ) {
                            return 'vendor-echarts-components'
                        }
                        if (
                            id.includes('node_modules/echarts/lib') ||
                            id.includes('node_modules/echarts/core')
                        ) {
                            return 'vendor-echarts-core'
                        }
                        if (id.includes('node_modules/zrender')) return 'vendor-zrender'
                        return undefined
                    },
                    // JS 资源统一输出到 dist/js，便于 CDN 与缓存策略按目录管理。
                    entryFileNames: 'js/[name]-[hash].js',
                    chunkFileNames: 'js/[name]-[hash].js',
                    // 非 JS 资源（css、图片、字体等）统一归档到 dist/assets。
                    assetFileNames: 'assets/[name]-[hash][extname]',
                },
            },
        },
    }
})
