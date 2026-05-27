import type { RouteRecordRaw } from 'vue-router';
import { MainLayout } from './layout';

// 常规路由

const constantRoutes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: 'login',
        component: () => import(/* webpackChunkName: "error" */ '@/views/Login/Index.vue'),
        meta: { title: '登录', role: 'login', isShow: true, requiresAuth: false }
    }, {
        path: '/error',
        name: 'error-main',
        component: MainLayout,
        meta: { title: '错误', role: 'error', icon: '', isShow: true, requiresAuth: false },
        children: [{
            path: '',
            name: 'error',
            component: () => import(/* webpackChunkName: "error" */ '../components/Error.vue'),
            meta: { title: '404', role: '404', isShow: true, requiresAuth: false }
        }, {
            path: '404',
            name: 'notFound',
            component: () => import(/* webpackChunkName: "error" */ '../components/Error.vue'),
            meta: { title: '404', role: '404', isShow: true, requiresAuth: false }
        }, {
            path: 'no-permission',
            name: 'notRole',
            component: () => import(/* webpackChunkName: "error" */ '../components/NotRolePurview.vue'),
            meta: { title: '暂无权限', role: 'noPermission', isShow: true, requiresAuth: false }
        }]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        redirect: '/error/404',
        meta: { title: '404', role: '404', isShow: true, requiresAuth: false },
    }
];

export default constantRoutes;
