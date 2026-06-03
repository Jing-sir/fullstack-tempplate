import type { TabsType } from '@/interface/TableType';
import sideBar from '@/store/sideBar';
import { storeToRefs } from 'pinia';

export default  function useTabsRole(tabs: TabsType[], key: string) {
    const activeKey = ref(key);
    const sidebarStore = sideBar();
    const { roleMenu } = storeToRefs(sidebarStore);
    // Tab 使用后端返回的权限元数据，本地组件注册表仍由具体页面维护。
    const fetchTabsRole = computed(() =>
        tabs.filter((item) => Boolean(item.role) && sidebarStore.hasPermission(String(item.role))),
    );
    const fetchShowTabs = computed(() => fetchTabsRole.value);

    // tabs 页面按钮是否显示
    const isShowTabsBtn = (btnRole: string): boolean => sidebarStore.hasPermission(btnRole);

    watch(() => fetchShowTabs.value, (value) => {
        if (value.length) activeKey.value = fetchShowTabs.value[0].code || '';
    }, { immediate: true });

    return {
        roleMenu,
        activeKey,
        fetchTabsRole,
        fetchShowTabs,
        isShowTabsBtn,
    };
}
