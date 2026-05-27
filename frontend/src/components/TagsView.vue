<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { storeToRefs } from 'pinia';
import useTagsView from '@/store/tagsView';
import i18n from '@/setup/i18n-setup';

type CachedRouteLocation = {
    fullPath: string;
};

const store = useTagsView();
const route = useRoute();
const router = useRouter();
const noRefreshHashPattern = /(?:#no-refresh)+$/;
const tabTrackRef = ref<HTMLElement | null>(null);

const { visitedViews: rawVisitedViews } = storeToRefs(store);

const visitedViews = computed(
    () => rawVisitedViews.value as unknown as RouteLocationNormalizedLoaded[],
);

watch(
    () => route.fullPath,
    () => {
        if (route.path.startsWith('/redirect/')) return;
        store.addVisitedView(route);
    },
    { immediate: true },
);

const deleteVisitedView = (index: number, isActive: boolean): void =>
    store.deleteVisitedView(index, isActive);

const isTabCacheNavigation = (hash = ''): boolean =>
    /^(#no-refresh)+$/.test(hash);

/**
 * tab 切换属于“读缓存”行为：
 * 1. 先清洗历史残留的 #no-refresh（兼容早期重复拼接）
 * 2. 再仅追加一次 #no-refresh，供 useOnActivated 区分“菜单刷新”与“tab复用”
 */
const handleGoCacheRoute = (targetRoute: CachedRouteLocation): void => {
    const normalizedPath = targetRoute.fullPath.replace(noRefreshHashPattern, '');
    router.replace(`${normalizedPath}#no-refresh`);
};

const handleGoHome = (): void => {
    router.push('/');
};

const formatRouteTitle = (title?: string | (() => string)): string =>
    title ? String(i18n.global.t(String(typeof title === 'function' ? title() : title))) : '';

const normalizeFullPath = (path = ''): string => path.replace(noRefreshHashPattern, '');

const isActiveHome = computed(() => route.path === '/');

const isActiveTab = (item: {
    name?: RouteLocationNormalizedLoaded['name'];
    path: string;
    fullPath: string;
}): boolean => {
    if (item.name && route.name === item.name) return true;
    if (route.path === item.path) return true;

    return normalizeFullPath(route.fullPath) === normalizeFullPath(item.fullPath);
};

type OrderedVisitedViewEntry = {
    rawIndex: number;
    view: RouteLocationNormalizedLoaded;
};

/**
 * 菜单点击（非 #no-refresh）时，把当前激活页签提到“首页”后第一个，
 * 避免页签很多时当前页被滚动条藏到右侧。
 * tabbar 点击（#no-refresh）时保持原顺序，避免频繁重排打断使用习惯。
 */
const orderedVisitedViewEntries = computed<OrderedVisitedViewEntry[]>(() => {
    const entries = visitedViews.value.map((view, rawIndex) => ({
        view,
        rawIndex,
    }));

    if (entries.length <= 1 || isTabCacheNavigation(route.hash)) {
        return entries;
    }

    const activeIndex = entries.findIndex(({ view }) =>
        isActiveTab({
            name: view.name,
            path: view.path,
            fullPath: view.fullPath,
        }),
    );

    if (activeIndex <= 0) {
        return entries;
    }

    const [activeEntry] = entries.splice(activeIndex, 1);
    return [activeEntry, ...entries];
});

watch(
    () => route.fullPath,
    () => {
        if (isTabCacheNavigation(route.hash)) return;
        nextTick(() => {
            tabTrackRef.value?.scrollTo({ left: 0 });
        });
    },
);
</script>

<template>
    <div class="w-full overflow-hidden bg-[var(--app-header-bg)] pb-4">
        <div
            ref="tabTrackRef"
            class="flex gap-1.5 overflow-x-auto bg-[var(--app-tags-track-bg)] px-3"
        >
            <button
                type="button"
                class="group inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-b-md px-3 text-[12px] font-medium transition-colors"
                :class="
                    isActiveHome
                        ? 'bg-[var(--app-tags-active-bg)] text-[var(--app-tags-active-text)] hover:bg-[var(--app-tags-active-bg)]'
                        : 'bg-[var(--app-tags-item-bg)] text-[var(--app-tags-item-text)] hover:bg-[var(--app-tags-hover-bg)] hover:text-[var(--app-text)]'
                "
                @click="handleGoHome"
            >
                <span class="whitespace-nowrap">{{ formatRouteTitle('首页') }}</span>
            </button>

            <!-- 动态页签 -->
            <button
                v-for="entry in orderedVisitedViewEntries"
                :key="entry.view.path"
                type="button"
                class="group inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-b-md px-3 text-[12px] font-medium transition-colors"
                :class="
                    isActiveTab({
                        name: entry.view.name,
                        path: entry.view.path,
                        fullPath: entry.view.fullPath,
                    })
                        ? 'bg-[var(--app-tags-active-bg)] text-[var(--app-tags-active-text)] hover:bg-[var(--app-tags-active-bg)]'
                        : 'bg-[var(--app-tags-item-bg)] text-[var(--app-tags-item-text)] hover:bg-[var(--app-tags-hover-bg)] hover:text-[var(--app-text)]'
                "
                @click="handleGoCacheRoute({ fullPath: entry.view.fullPath })"
            >
                <span class="whitespace-nowrap">{{ formatRouteTitle(entry.view.meta.title) }}</span>
                <!-- 关闭按钮：hover 或激活时显示 -->
                <span
                    class="inline-flex h-4 w-4 items-center justify-center rounded-full text-xs opacity-100 transition-colors"
                    :class="
                        isActiveTab({
                            name: entry.view.name,
                            path: entry.view.path,
                            fullPath: entry.view.fullPath,
                        })
                            ? 'text-[var(--app-tags-active-close-text)] hover:text-[var(--app-tags-active-close-hover-text)]'
                            : 'text-[var(--app-tag-close-text)] hover:text-[var(--app-tag-close-hover-text)]'
                    "
                    @click.stop="deleteVisitedView(entry.rawIndex, $route.path === entry.view.path)"
                >
                    ×
                </span>
            </button>
        </div>
    </div>
</template>
