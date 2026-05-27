<script setup lang="ts">
/**
 * Main.vue — 已登录后的主布局容器（Layout Shell）。
 *
 * 职责：
 * 1. 渲染固定侧栏（SideNavigationBar）
 * 2. 渲染顶部 Header 和标签页（TagsView）
 * 3. 承载 <router-view>，支持 keep-alive 页面缓存
 * 4. 监听路由变化触发权限菜单拉取
 * 5. 维护网络在线状态与布局顶部高度 CSS 变量
 *
 * 注意：本文件不是应用根节点，不要与 App.vue 混淆。
 * App.vue 是全局根（负责 locale/theme），
 * Main.vue 是"登录后"的布局壳，作为多个一级权限路由的 component 使用。
 */
import Header from '@/components/Header.vue'
import SideNavigationBar from '@/components/SideNavigationBar/index.vue'
import TagsView from '@/components/TagsView.vue'

const { t } = useI18n()

const isOnline = ref<boolean>(window.navigator.onLine)

const hasRoute = useRoute()
const shellTopRef = ref<HTMLElement | null>(null)
let shellTopResizeObserver: ResizeObserver | null = null

const store = sideBar()
const { hasFetchedRoleMenu, isSidebar, roleMenu } = storeToRefs(store)
const tagsViewStore = tagsView()

/**
 * keep-alive 缓存 key 由“路由 path + 缓存版本”组成：
 * - tabbar 普通切换：版本不变，命中缓存，保留搜索与列表状态
 * - 左侧 menu 点击：menu 逻辑会先 bump 版本，再跳转，触发该页重挂载拿最新数据
 */
const getRouteCacheKey = (path = ''): string =>
    `${path}::${tagsViewStore.getRouteCacheVersion(path)}`

const onCollapse = (val: boolean) => {
    isSidebar.value = val
}

const syncOnlineStatus = (): void => {
    isOnline.value = window.navigator.onLine
}

const syncShellTopHeight = (): void => {
    const shellTopHeight = shellTopRef.value?.offsetHeight ?? 0
    document.documentElement.style.setProperty('--app-shell-top-height', `${shellTopHeight}px`)
}

const ensureLayoutRoutes = (): void => {
    if (hasRoute.path.startsWith('/redirect/')) return
    if (!hasFetchedRoleMenu.value && !roleMenu.value.length) {
        store.fetchSidebarRoutes()
    }
}

watch(
    () => hasRoute.path,
    () => {
        ensureLayoutRoutes()
    },
    { immediate: true },
)

onMounted(() => {
    syncOnlineStatus()
    nextTick(() => {
        syncShellTopHeight()
    })

    if (shellTopRef.value) {
        shellTopResizeObserver = new ResizeObserver(() => {
            syncShellTopHeight()
        })
        shellTopResizeObserver.observe(shellTopRef.value)
    }

    window.addEventListener('online', syncOnlineStatus)
    window.addEventListener('offline', syncOnlineStatus)
    window.addEventListener('resize', syncShellTopHeight)
})

onBeforeUnmount(() => {
    window.removeEventListener('online', syncOnlineStatus)
    window.removeEventListener('offline', syncOnlineStatus)
    window.removeEventListener('resize', syncShellTopHeight)
    shellTopResizeObserver?.disconnect()
    shellTopResizeObserver = null
})

watch(
    () => [hasRoute.fullPath, isSidebar.value],
    () => {
        nextTick(() => {
            syncShellTopHeight()
        })
    },
)
</script>

<template>
    <a-layout class="bg-transparent">
        <a-layout-sider
            theme="dark"
            breakpoint="lg"
            collapsible
            :width="260"
            :collapsed-width="88"
            :collapsed="isSidebar"
            class="app-shell-sider fixed inset-y-0 left-0 z-30 overflow-hidden"
            @collapse="onCollapse"
        >
            <SideNavigationBar />
        </a-layout-sider>
        <a-layout
            class="flex min-h-[100dvh] flex-col transition-[margin-left] duration-300"
            :class="isSidebar ? 'ml-[88px]' : 'ml-[260px]'"
        >
            <div
                ref="shellTopRef"
                class="sticky top-0 z-20 shrink-0 bg-[var(--app-header-bg)] pt-0"
            >
                <Header :is-online="isOnline" />
                <TagsView />
            </div>
            <a-layout-content class="flex-1 bg-[var(--app-surface)] px-[14px] pb-[18px]">
                <template v-if="isOnline">
                    <router-view v-slot="{ Component, route }">
                        <transition
                            enter-active-class="transform-gpu transition duration-220 ease-out"
                            enter-from-class="translate-y-1 opacity-0"
                            leave-active-class="transform-gpu transition duration-160 ease-in"
                            leave-to-class="-translate-y-1 opacity-0"
                        >
                            <!--
                              缓存策略：
                              1. tabbar 切换：命中 keep-alive，保留搜索与列表状态
                              2. tab 关闭后再次进入：通过 path 缓存版本触发全新挂载
                              3. 动画使用默认模式（非 out-in），避免先卸载旧页导致内容区短暂空白
                            -->
                            <keep-alive>
                                <component
                                    v-if="Component"
                                    :is="Component"
                                    :key="getRouteCacheKey(route.path)"
                                />
                            </keep-alive>
                        </transition>
                    </router-view>
                </template>
                <div
                    v-else
                    class="flex min-h-[var(--content-pane-min-height)] flex-col items-center justify-center gap-2.5 rounded-[var(--app-pane-radius)] bg-[var(--app-surface)] text-center"
                >
                    <p class="text-xl font-bold text-[var(--app-text)]">
                        {{ t('网络异常') }}
                    </p>
                    <p class="text-sm text-[var(--app-text-muted)]">
                        {{ t('请检查网络状态后刷新重试') }}
                    </p>
                </div>
            </a-layout-content>
        </a-layout>
    </a-layout>
    <!--  <LockScreenDialog />-->
</template>

<style scoped lang="scss">
.app-shell-sider {
    :deep(.arco-layout-sider-trigger) {
        @apply border-0 text-white/80 transition-colors duration-200;
        height: 48px;
        background: linear-gradient(
            180deg,
            var(--app-sidebar-surface-strong) 0%,
            var(--app-sidebar-surface) 100%
        );
        backdrop-filter: blur(10px);
    }

    :deep(.arco-layout-sider-trigger:hover) {
        color: #fff;
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-primary-6) 18%, rgb(255 255 255 / 6%) 82%) 0%,
            color-mix(in srgb, var(--color-primary-6) 12%, rgb(255 255 255 / 2%) 88%) 100%
        );
    }
}
</style>
