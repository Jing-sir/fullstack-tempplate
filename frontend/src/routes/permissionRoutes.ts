import type { RouteRecordRaw } from 'vue-router';
import { MainLayout } from './layout';

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
            role: 'Home',
            title: '首页',
            hidden: true,
            icon: 'icon-zhuye',
        },
        children: [
            {
                path: '',
                name: 'Home',
                component: () => import(/* webpackChunkName: "Home" */ '@/views/Home/Index.vue'),
                // 首页仍然要求登录态，但不参与后端权限菜单校验。
                meta: {
                    title: '首页',
                    role: 'Home',
                    isShow: true,
                    requiresAuth: true,
                    ignorePermission: true,
                },
            },
        ],
    },
    {
        path: '/user', // 用户管理
        name: 'user',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: { title: '用户管理', icon: 'accountManage', role: 'user', requiresAuth: true },
        children: [
            {
                path: 'userList',
                name: 'userList',
                component: () =>
                    import(/* webpackChunkName: "userList" */ '@/views/User/UserList/Index.vue'),
                meta: { title: '用户管理', role: 'userList', requiresAuth: true },
            },
            {
                path: 'labelList',
                name: 'labelList',
                component: () =>
                    import(/* webpackChunkName: "labelList" */ '@/views/User/LabelList/Index.vue'),
                meta: { title: '标签管理', role: 'labelList', requiresAuth: true },
            },
            {
                path: 'kolList',
                name: 'kolList',
                component: () =>
                    import(/* webpackChunkName: "kolList" */ '@/views/User/KOLList/Index.vue'),
                meta: { title: 'KOL列表', role: 'kolList', requiresAuth: true },
            },
            {
                path: 'user-auth',
                name: 'userAuthentication',
                component: () =>
                    import(
                        /* webpackChunkName: "userAuthentication" */ '@/views/User/UserAuthentication/Index.vue'
                    ),
                meta: { title: '用户信息认证', role: 'userAuthentication', requiresAuth: true },
            },
            {
                path: 'user-whitelist',
                name: 'userWhiteList',
                component: () =>
                    import(
                        /* webpackChunkName: "userWhiteList" */ '@/views/User/UserWhiteList/Index.vue'
                    ),
                meta: { title: '用户认证等级白名单', role: 'userWhiteList', requiresAuth: true },
            },
            {
                path: 'cancellationApplication',
                name: 'cancellationApplication',
                component: () =>
                    import(
                        /* webpackChunkName: "cancellationApplication" */ '@/views/User/CancellationApplication/Index.vue'
                    ),
                meta: { title: '注销申请', role: 'cancellationApplication', requiresAuth: true },
            },
            {
                path: 'user-auth/:id',
                name: 'UserAuthDetail',
                component: () =>
                    import(
                        /* webpackChunkName: "userAuthenticationDetail" */ '@/views/User/UserAuthentication/AuditDetail/Index.vue'
                    ),
                meta: {
                    title: '审核详情',
                    role: 'userAuthenticationDetail',
                    requiresAuth: true,
                    isShow: true,
                },
            },
            {
                path: 'userLoginLog',
                name: 'userLoginLog',
                component: () =>
                    import(
                        /* webpackChunkName: "userLoginLog" */ '@/views/User/UserLoginLog/Index.vue'
                    ),
                meta: { title: '用户登录日志', role: 'userLoginLog', requiresAuth: true },
            },
        ],
    },
    {
        path: '/userAddress',
        name: 'userAddress',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: { title: '地址管理', icon: 'addressManage', role: 'user', requiresAuth: true },
        children: [
            {
                path: 'addressList',
                name: 'addressList',
                component: () =>
                    import(/* webpackChunkName: "addressList" */ '@/views/AddressList/Index.vue'),
                meta: { title: '地址列表', role: 'addressList', requiresAuth: true },
            },
        ],
    },
    {
        path: '/flashExchange',
        name: 'flashExchange',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: {
            title: '闪兑',
            icon: 'flashExchange',
            role: 'flashExchange',
            requiresAuth: true,
        },
        children: [
            {
                path: 'transactionManagement',
                name: 'transactionManagement',
                component: () =>
                    import(
                        /* webpackChunkName: "transactionManagement" */ '@/views/FlashExchange/TransactionManagement/Index.vue'
                    ),
                meta: { title: '交易对管理', role: 'transactionManagement', requiresAuth: true },
            },
            {
                path: 'orderManagement',
                name: 'orderManagement',
                component: () =>
                    import(
                        /* webpackChunkName: "orderManagement" */ '@/views/FlashExchange/OrderManagement/Index.vue'
                    ),
                meta: { title: '订单管理', role: 'orderManagement', requiresAuth: true },
            },
            {
                path: 'tariffManagement',
                name: 'tariffManagement',
                component: () =>
                    import(
                        /* webpackChunkName: "tariffManagement" */ '@/views/FlashExchange/TariffManagement/Index.vue'
                    ),
                meta: { title: '费率管理', role: 'tariffManagement', requiresAuth: true },
            },
            {
                path: 'transactionLimitManagement',
                name: 'transactionLimitManagement',
                component: () =>
                    import(
                        /* webpackChunkName: "transactionLimitManagement" */ '@/views/FlashExchange/TransactionLimitManagement/Index.vue'
                    ),
                meta: {
                    title: '交易限额限次管理',
                    role: 'transactionLimitManagement',
                    requiresAuth: true,
                },
            },
        ],
    },
    {
        path: '/invitation-rebate-manage',
        name: 'userListInvitation',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: {
            title: '邀请返佣管理',
            icon: 'invitationRebateManage',
            role: 'invitationRebateManage',
            requiresAuth: true,
        },
        children: [
            {
                path: 'invitationRebate',
                name: 'invitationRebate',
                component: () =>
                    import(
                        /* webpackChunkName: "invitationRebate" */ '@/views/User/InvitationRebate/Index.vue'
                    ),
                meta: { title: '邀请返佣', role: 'invitationRebate', requiresAuth: true },
            },
            {
                path: 'invitationRebateSettings',
                name: 'invitationRebateSettings',
                component: () =>
                    import(
                        /* webpackChunkName: "invitationRebateSettings" */ '@/views/User/InvitationRebateSettings/Index.vue'
                    ),
                meta: {
                    title: '邀请返佣设置表',
                    role: 'invitationRebateSettings',
                    requiresAuth: true,
                },
            },
        ],
    },
    // ─── 资产管理模块 ────────────────────────────────────────────────────────────
    {
        path: '/asset',
        name: 'asset',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: {
            title: '资产管理',
            icon: 'assetManage',
            role: 'asset',
            requiresAuth: true,
        },
        children: [
            {
                // 代理商资产（老项目 role=assetList，对齐后端权限菜单）
                path: 'assetList',
                name: 'assetList',
                component: () =>
                    import(
                        /* webpackChunkName: "agentAssetList" */ '@/views/AssetManage/agent-asset-list/Index.vue'
                    ),
                meta: { title: '代理商资产', role: 'assetList', requiresAuth: true },
            },
            {
                // 用户资产
                path: 'userAssetList',
                name: 'userAssetList',
                component: () =>
                    import(
                        /* webpackChunkName: "userAssetList" */ '@/views/AssetManage/user-asset-list/Index.vue'
                    ),
                meta: { title: '用户资产', role: 'userAssetList', requiresAuth: true },
            },
            {
                // 用户资产流水
                path: 'userAssetsJournal',
                name: 'userAssetsJournal',
                component: () =>
                    import(
                        /* webpackChunkName: "userAssetsJournal" */ '@/views/AssetManage/user-asset-journal/Index.vue'
                    ),
                meta: { title: '用户资产流水', role: 'userAssetsJournal', requiresAuth: true },
            },
            {
                // 划转记录
                path: 'transfer',
                name: 'transfer',
                component: () =>
                    import(
                        /* webpackChunkName: "transfer" */ '@/views/AssetManage/asset-transfer-record/Index.vue'
                    ),
                meta: { title: '划转记录', role: 'transfer', requiresAuth: true },
            },
            {
                // 用户资产冻结表（老项目 role=assetFreeze，对齐后端权限菜单）
                path: 'assetFreeze',
                name: 'assetFreeze',
                component: () =>
                    import(
                        /* webpackChunkName: "userAssetFreeze" */ '@/views/AssetManage/user-asset-freeze/Index.vue'
                    ),
                meta: { title: '用户资产冻结表', role: 'assetFreeze', requiresAuth: true },
            },
            {
                // 用户资产冻结历史（老项目 role=assetFreezeHistory，对齐后端权限菜单）
                path: 'assetFreezeHistory',
                name: 'assetFreezeHistory',
                component: () =>
                    import(
                        /* webpackChunkName: "userAssetFreezeHistory" */ '@/views/AssetManage/user-asset-freeze-history/Index.vue'
                    ),
                meta: { title: '用户资产冻结历史', role: 'assetFreezeHistory', requiresAuth: true },
            },
            {
                // 用户法币资产（老项目 role=userFiatAssetList，对齐后端权限菜单）
                path: 'userFiatAssetList',
                name: 'userFiatAssetList',
                component: () =>
                    import(
                        /* webpackChunkName: "userFiatAsset" */ '@/views/AssetManage/user-fiat-asset/Index.vue'
                    ),
                meta: { title: '用户法币资产', role: 'userFiatAssetList', requiresAuth: true },
            },
            {
                // 用户法币资产流水
                path: 'userFiatAssetJournal',
                name: 'userFiatAssetJournal',
                component: () =>
                    import(
                        /* webpackChunkName: "userFiatAssetJournal" */ '@/views/AssetManage/user-fiat-asset-journal/Index.vue'
                    ),
                meta: {
                    title: '用户法币资产流水',
                    role: 'userFiatAssetJournal',
                    requiresAuth: true,
                },
            },
        ],
    },
    {
        path: '/systemManage', // 系统管理
        name: 'systemManage',
        redirect: 'noRedirect', // 当设置 noRedirect 的时候该路由在面包屑导航中不可被点击
        component: MainLayout,
        meta: { title: '系统管理', icon: 'systemManage', role: 'systemManage', requiresAuth: true },
        children: [
            {
                // 角色与权限
                path: 'operationLog',
                name: 'operationLog',
                component: () =>
                    import(
                        /* webpackChunkName: "systemManage" */ '@/views/SystemManage/operation-log/Index.vue'
                    ),
                meta: {
                    title: '操作日志',
                    role: 'operationLog',
                    icon: 'operationLog',
                    requiresAuth: true,
                },
            },
            {
                // 角色与权限
                path: 'rolePermissions',
                name: 'rolePermissions',
                component: () =>
                    import(
                        /* webpackChunkName: "systemManage" */ '@/views/SystemManage/role-permissions/Index.vue'
                    ),
                meta: {
                    title: '角色与权限',
                    role: 'rolePermissions',
                    icon: 'rolePermissions',
                    requiresAuth: true,
                },
            },
            {
                // 角色与权限
                path: 'addRolePermissions',
                name: 'addRolePermissions',
                component: () =>
                    import(
                        /* webpackChunkName: "addRolePermissions" */ '@/views/SystemManage/role-permissions/form/Index.vue'
                    ),
                meta: { title: '新增', role: 'rolePermissions', isShow: true, requiresAuth: true },
            },
            {
                // 角色与权限-查看
                path: 'viewRolePermissions/:id/:see',
                name: 'viewRolePermissions',
                component: () =>
                    import(
                        /* webpackChunkName: "viewRolePermissions" */ '@/views/SystemManage/role-permissions/form/Index.vue'
                    ),
                meta: { title: '查看', role: 'rolePermissions', isShow: true, requiresAuth: true },
            },
            {
                // 角色与权限-编辑
                path: 'editRolePermissions/:id',
                name: 'editRolePermissions',
                component: () =>
                    import(
                        /* webpackChunkName: "editRolePermissions" */ '@/views/SystemManage/role-permissions/form/Index.vue'
                    ),
                meta: { title: '编辑', role: 'rolePermissions', isShow: true, requiresAuth: true },
            },
            {
                // 账号管理
                path: 'accountManage',
                name: 'accountManage',
                component: () =>
                    import(
                        /* webpackChunkName: "addRolePermissions" */ '@/views/SystemManage/account-manage/Index.vue'
                    ),
                meta: {
                    title: '账号管理',
                    role: 'accountManage',
                    icon: 'accountManage',
                    requiresAuth: true,
                },
            },
            {
                // 账号管理-新增
                path: 'addAccount',
                name: 'addAccount',
                component: () =>
                    import(
                        /* webpackChunkName: "addAccount" */ '@/views/SystemManage/account-manage/form/Index.vue'
                    ),
                meta: { title: '新增', role: 'accountManage', requiresAuth: true, isShow: true },
            },
            {
                // 账号管理-编辑
                path: 'editAccount/:id',
                name: 'editAccount',
                component: () =>
                    import(
                        /* webpackChunkName: "editAccount" */ '@/views/SystemManage/account-manage/form/Index.vue'
                    ),
                meta: { title: '编辑', role: 'accountManage', requiresAuth: true, isShow: true },
            },
        ],
    },
    {
        path: '/kolConfiguration', // KOL推广计划
        name: 'kolConfiguration',
        redirect: 'noRedirect',
        component: MainLayout,
        meta: { title: 'KOL推广计划', icon: 'kolConfiguration', role: 'kolConfiguration', requiresAuth: true },
        children: [
            {
                // 返佣业务配置
                path: 'rebateBusinessConfiguration',
                name: 'rebateBusinessConfiguration',
                component: () =>
                    import(
                        /* webpackChunkName: "rebateBusinessConfiguration" */ '@/views/KolConfiguration/kol-rebate-config/Index.vue'
                    ),
                meta: { title: '返佣业务配置', role: 'rebateBusinessConfiguration', requiresAuth: true },
            },
            {
                // KOL开卡配置
                path: 'agentCardOpeningConfiguration',
                name: 'agentCardOpeningConfiguration',
                component: () =>
                    import(
                        /* webpackChunkName: "agentCardOpeningConfiguration" */ '@/views/KolConfiguration/kol-opening-config/Index.vue'
                    ),
                meta: { title: 'KOL开卡配置', role: 'agentCardOpeningConfiguration', requiresAuth: true },
            },
            {
                // KOL申请列表
                path: 'invitationList',
                name: 'invitationList',
                component: () =>
                    import(
                        /* webpackChunkName: "invitationList" */ '@/views/KolConfiguration/kol-invitation-list/Index.vue'
                    ),
                meta: { title: 'KOL申请列表', role: 'invitationList', requiresAuth: true },
            },
        ],
    },
]

export default permissionRoutes;
