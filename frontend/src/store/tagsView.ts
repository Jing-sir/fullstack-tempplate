import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import type { RouteLocationNormalized } from 'vue-router';

/** 持久化 tab 数据的 localStorage key（v2 用于隔离旧缓存结构） */
const TAGS_STORAGE_KEY = 'tagsView_visitedViews_v2';

/**
 * 从 localStorage 读取持久化的 tab 列表。
 * 读取失败（JSON 损坏等）时静默返回空数组，不影响正常使用。
 */
const loadVisitedViewsFromStorage = (): Partial<RouteLocationNormalized>[] => {
    try {
        const raw = localStorage.getItem(TAGS_STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as Partial<RouteLocationNormalized>[];
    } catch {
        return [];
    }
};

/**
 * 将 tab 列表写入 localStorage。
 * 只保存路由还原所需的最小字段，避免循环引用或冗余数据。
 */
const saveVisitedViewsToStorage = (views: Partial<RouteLocationNormalized>[]): void => {
    try {
        const minimal = views.map(({ path, meta, query, fullPath, name, params }) => ({
            path,
            meta,
            query,
            fullPath,
            name,
            params,
        }));
        localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(minimal));
    } catch {
        // localStorage 写入失败（如隐私模式容量为 0）时静默忽略
    }
};

export default defineStore('tagsView', () => {
    // 初始化时优先从 localStorage 恢复，没有则使用空数组
    const visitedViews = ref<Partial<RouteLocationNormalized>[]>(loadVisitedViewsFromStorage());
    /**
     * 路由缓存版本号：
     * - tabbar 切换不变，复用缓存
     * - menu 点击/关闭 tab 时递增，强制该 path 重新挂载
     */
    const routeCacheVersionMap = ref<Record<string, number>>({});
    const noRefreshHashPattern = /(?:#no-refresh)+$/;

    /**
     * tabs 里缓存的 fullPath 必须保持“纯路径语义”，
     * 不能把 #no-refresh 这种行为标记写回缓存源，否则会在后续跳转中被重复拼接。
     */
    const normalizeTabFullPath = (path: string): string => path.replace(noRefreshHashPattern, '');
    const bumpRouteCacheVersion = (path?: string): void => {
        if (!path) return;
        routeCacheVersionMap.value[path] = (routeCacheVersionMap.value[path] || 0) + 1;
    };
    const getRouteCacheVersion = (path = ''): number => routeCacheVersionMap.value[path] || 0;

    const firstToUpper = (str:string):string => str.replace(/( |^)[a-z]/g, (L:string) => L.toUpperCase());

    const addVisitedView = (view: RouteLocationNormalized): void => { // 更新tabs
        const { path, meta, query, fullPath, name, params } = view;
        if (name === 'Home' || path.includes('login') || path.includes('error')) return;
        const acc = visitedViews.value.findIndex((item) => item.name === name);
        const normalizedFullPath = normalizeTabFullPath(fullPath);
        if (acc === -1) visitedViews.value.push({ path, meta, query, fullPath: normalizedFullPath, params, name });
        else visitedViews.value[acc] = { path, meta, query, fullPath: normalizedFullPath, params, name };
    };

    const $router = useRouter();
    const route = useRoute();
    const deleteVisitedView = (index: number, isActive: boolean): void => { // 删除tabs
        if (index < 0 || index >= visitedViews.value.length) return;
        const targetView = visitedViews.value[index] as RouteLocationNormalized | undefined;
        bumpRouteCacheVersion(targetView?.path);
        visitedViews.value.splice(index, 1);
        if (isActive) {
            const latestView = visitedViews.value.slice(-1)[0];
            $router.replace(latestView || '/');
        }
    };

    const deleteVisitedViewByName = (name: string, isActive:boolean): void => { // 删除tabs
        const index = visitedViews.value.findIndex((item) => item.name === name);
        if (index === -1) return;
        const targetView = visitedViews.value[index] as RouteLocationNormalized | undefined;
        bumpRouteCacheVersion(targetView?.path);
        visitedViews.value.splice(index, 1);
        if (isActive) {
            const latestView = visitedViews.value.slice(-1)[0];
            $router.replace(latestView || '/');
        }
    };

    const delCurRouter = (): void => { // 删除当前路由
        bumpRouteCacheVersion(route.path);
        visitedViews.value = visitedViews.value.filter((item) => item.path !== route.path);
    };

    const clearVisitedView = (): void => { // 清除tabs
        visitedViews.value.forEach((item) => {
            bumpRouteCacheVersion(item.path);
        });
        visitedViews.value = [];
        // 退出登录 / 密码修改后清除持久化，避免下次登录残留旧标签
        localStorage.removeItem(TAGS_STORAGE_KEY);
    };

    /**
     * 监听 visitedViews 变化，实时同步到 localStorage。
     * deep: true 确保数组内元素属性变更（如 query 更新）也能触发持久化。
     */
    watch(
        visitedViews,
        (views) => {
            saveVisitedViewsToStorage(views);
        },
        { deep: true },
    );

    return {
        delCurRouter,
        visitedViews,
        firstToUpper,
        addVisitedView,
        bumpRouteCacheVersion,
        getRouteCacheVersion,
        clearVisitedView,
        deleteVisitedView,
        deleteVisitedViewByName
    };
});
