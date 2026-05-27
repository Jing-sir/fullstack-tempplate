import constantRoutes from '@/routes/constantRoutes';
import permissionRoutes from '@/routes/permissionRoutes';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    ...permissionRoutes,
    ...constantRoutes,
];

export default routes;
