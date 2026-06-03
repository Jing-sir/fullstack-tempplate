import useSideBar from '@/store/sideBar';
import { useRoute } from 'vue-router';

export default function useButtonRole() { // 按钮权限列表获取
    const route = useRoute();
    const sidebarStore = useSideBar();

    /**
     * 判断按钮是否具备权限。
     *
     * 规则：
     * 1. 默认使用当前 route.name 作为前缀
     * 2. 也允许外部传入 routeName，兼容“当前页代操作其它模块按钮”的场景
     * 3. 按钮权限名统一拼成 `${routeName}-${btnRole}`
     */
    const isShowBtn = (btnRole: string, routeName?: string): boolean => {
        const currentRouteName = String(routeName ?? route.name ?? '');
        if (!currentRouteName || !btnRole) return false;

        return sidebarStore.hasPermission(`${currentRouteName}-${btnRole}`);
    };

    return {
        isShowBtn,
    };
}
