<script setup lang="ts">
import enUS from '@arco-design/web-vue/es/locale/lang/en-us'
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'
import { getI18nLanguage } from '@/setup/i18n-setup'
import i18n from './setup/i18n-setup'
import 'dayjs/locale/zh-cn'
import dayjs from 'dayjs'
import 'dayjs/locale/en'

/**
 * App.vue — 应用根节点。
 *
 * 职责仅限于：
 * 1. 挂载 Arco Design 全局配置（locale、size）
 * 2. 提供全局 <router-view>
 * 3. 应用级主题（颜色、模式）初始化
 *
 * 布局骨架（侧栏 + 头部 + 标签页 + 内容区）不在这里，
 * 在已登录路由的 component Main.vue 中实现。
 */

const userStore = user()
const themeStore = theme()

const renderKey = computed(() => `app-key-${i18n.global.locale.value}`)

const currLang = computed(() => (i18n.global.locale.value === 'zh-CN' ? zhCN : enUS)) // arco-vue国际化语言key

// 应用启动时先同步语言环境，再初始化主题外观。
// 主题外观包含两部分：
// 1. 品牌主色，驱动项目内的主强调色
// 2. 主题模式，驱动 light / dark 和 Arco dark token
onBeforeMount(() => {
    themeStore.initThemeColor()
    themeStore.initThemeMode()
})

watch(
    () => getI18nLanguage(),
    (language) => {
        dayjs.locale(language === 'zh-CN' ? 'zh-cn' : 'en')
    },
    { immediate: true },
)

userStore.getPwdIv()
</script>

<template>
    <div id="app" class="min-h-full min-w-[var(--app-min-width)] bg-[var(--app-bg)]">
        <a-config-provider size="large" :locale="currLang">
            <router-view :key="renderKey" />
        </a-config-provider>
    </div>
</template>
