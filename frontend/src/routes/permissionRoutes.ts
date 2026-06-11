import type { RouteRecordRaw } from 'vue-router';
import type { Component } from 'vue';
import { MainLayout } from './layout';
type RouteViewModule = {
    default: Component;
};
const routeViewModules = import.meta.glob<RouteViewModule>('../views/**/*.vue');
const fallbackRouteView = (): Promise<RouteViewModule> =>
    import('@/components/Error.vue') as Promise<RouteViewModule>;
const loadRouteView = (viewPath: string): (() => Promise<RouteViewModule>) =>
    routeViewModules[`../views/${viewPath}.vue`] ?? fallbackRouteView;
/**
 * permissionRoutes — 需要后端权限菜单过滤的路由。
 *
 * 这些路由在 sideBar.ts 中结合后端返回的菜单列表做动态过滤，
 * 只有当前用户有权限的路由才会出现在侧边栏中。
 *
 * 注意：此文件从原来的 asyncRoutes.ts 重命名而来，语义更清晰。
 * asyncRoutes.ts 保留为兼容 re-export，待所有引用迁移完成后删除。
 */
const permissionRoutes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'main',
        component: MainLayout,
        meta: {
            requiresAuth: false,
            title: '首页',
            hidden: true,
            icon: 'icon-zhuye',
        },
        children: [
            {
                path: '',
                name: 'Home',
                component: loadRouteView('Home/Index'),
                // 首页仍然要求登录态，但不参与后端权限菜单校验。
                meta: {
                    title: '首页',
                    isShow: true,
                    requiresAuth: true,
                    ignorePermission: true,
                },
            },
        ],
    },
    {
        path: '/systemManage', // 系统管理
        name: 'systemManage',
        redirect: 'noRedirect', // 当设置 noRedirect 的时候该路由在面包屑导航中不可被点击
        component: MainLayout,
        meta: { title: '系统管理', icon: 'systemManage', requiresAuth: true },
        children: [
            {
                // 操作日志
                path: 'operationLog',
                name: 'operationLog',
                component: loadRouteView('SystemManage/operation-log/Index'),
                meta: {
                    title: '操作日志',
                    icon: 'operationLog',
                    requiresAuth: true,
                    permissionKey: 'operationLog',
                    permissionParent: 'operationLog',
                },
            },
            {
                // 角色与权限
                path: 'rolePermissions',
                name: 'rolePermissions',
                component: loadRouteView('SystemManage/role-permissions/Index'),
                meta: {
                    title: '角色与权限',
                    icon: 'rolePermissions',
                    requiresAuth: true,
                    permissionKey: 'rolePermissions',
                    permissionParent: 'rolePermissions',
                },
            },
            {
                // 角色与权限
                path: 'addRolePermissions',
                name: 'addRolePermissions',
                component: loadRouteView('SystemManage/role-permissions/form/Index'),
                meta: {
                    title: '新增',
                    isShow: true,
                    requiresAuth: true,
                    permissionKey: 'rolePermissions-add',
                    permissionParent: 'rolePermissions',
                },
            },
            {
                // 角色与权限-查看
                path: 'viewRolePermissions/:id/:see',
                name: 'viewRolePermissions',
                component: loadRouteView('SystemManage/role-permissions/form/Index'),
                meta: {
                    title: '查看',
                    isShow: true,
                    requiresAuth: true,
                    permissionKey: 'rolePermissions-view',
                    permissionParent: 'rolePermissions',
                },
            },
            {
                // 角色与权限-编辑
                path: 'editRolePermissions/:id',
                name: 'editRolePermissions',
                component: loadRouteView('SystemManage/role-permissions/form/Index'),
                meta: {
                    title: '编辑',
                    isShow: true,
                    requiresAuth: true,
                    permissionKey: 'rolePermissions-edit',
                    permissionParent: 'rolePermissions',
                },
            },
            {
                // 账号管理
                path: 'accountManage',
                name: 'accountManage',
                component: loadRouteView('SystemManage/account-manage/Index'),
                meta: {
                    title: '账号管理',
                    icon: 'accountManage',
                    requiresAuth: true,
                    permissionKey: 'accountManage',
                    permissionParent: 'accountManage',
                },
            },
            {
                // 账号管理-新增
                path: 'addAccount',
                name: 'addAccount',
                component: loadRouteView('SystemManage/account-manage/form/Index'),
                meta: {
                    title: '新增',
                    requiresAuth: true,
                    isShow: true,
                    permissionKey: 'accountManage-add',
                    permissionParent: 'accountManage',
                },
            },
            {
                // 账号管理-编辑
                path: 'editAccount/:id',
                name: 'editAccount',
                component: loadRouteView('SystemManage/account-manage/form/Index'),
                meta: {
                    title: '编辑',
                    requiresAuth: true,
                    isShow: true,
                    permissionKey: 'accountManage-edit',
                    permissionParent: 'accountManage',
                },
            },
        ],
    },
    {
        path: '/permissionLab',
        name: 'permissionLab',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: {
            title: '权限验证中心',
            icon: 'rolePermissions',
            requiresAuth: true,
            permissionKey: 'permissionLab',
        },
        children: [
            {
                path: 'orders',
                name: 'permissionLabOrders',
                component: loadRouteView('PermissionLab/order-list/Index'),
                meta: {
                    title: '订单权限样例',
                    requiresAuth: true,
                    permissionKey: 'permissionLabOrders',
                    permissionParent: 'permissionLabOrders',
                },
            },
            {
                path: 'orderDetail/:id',
                name: 'permissionLabOrderDetail',
                component: loadRouteView('PermissionLab/order-detail/Index'),
                meta: {
                    title: '订单详情',
                    isShow: true,
                    requiresAuth: true,
                    permissionKey: 'permissionLabOrders-detail',
                    permissionParent: 'permissionLabOrders',
                },
            },
        ],
    },
]
export default permissionRoutes;
