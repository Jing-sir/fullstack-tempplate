
export function useOnActivated(fn:() => void) {
    const route = useRoute();
    const noRefreshHashPattern = /^#no-refresh(?:#no-refresh)*$/;

    onActivated(() => {
        // tabbar 切换时通过 hash 标记“复用缓存，不触发请求”。
        // 这里兼容历史重复 hash（#no-refresh#no-refresh）并统一视为“不刷新”。
        if (noRefreshHashPattern.test(route.hash)) return;
        fn();
    });
}
