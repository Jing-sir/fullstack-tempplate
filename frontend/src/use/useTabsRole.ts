import type { TabsType } from '@/interface/TableType';
import sideBar from '@/store/sideBar';
import { storeToRefs } from 'pinia';
import type api from '@/api/permission';

export default  function useTabsRole(tabs: TabsType[], key: string) {
    const activeKey = ref(key);
    const { roleMenu } = storeToRefs(sideBar());
    // 获取按钮权限列表
    const fetchTabsRole = computed<PromiseReturnType<typeof api.homeMenu>>(() => roleMenu.value.filter((item) => item.type === '3'));
    // 获取权限component 对象
    const fetchRoleObj = computed(() => Object.fromEntries(fetchTabsRole.value.map((item) => [item.name, item.name])));
    // 过滤只显示有权限的tabs
    const fetchShowTabs = computed(() => tabs.filter((item) => fetchRoleObj.value[String(item.role)]));

    // tabs 页面按钮是否显示
    const isShowTabsBtn = (btnRole: string): boolean => roleMenu.value.findIndex(({ name }) => name === btnRole) > 0;

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
