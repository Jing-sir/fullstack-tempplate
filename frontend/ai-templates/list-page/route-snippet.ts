import { MainLayout } from '@/routes/layout'

export const exampleRouteSnippet = {
    path: '/example',
    name: 'example',
    redirect: 'noRedirect',
    component: MainLayout,
    meta: {
        title: '示例管理',
        icon: 'systemManage',
        role: 'example',
        requiresAuth: true,
    },
    children: [
        {
            path: 'exampleList',
            name: 'exampleList',
            component: () =>
                import(
                    /* webpackChunkName: "exampleList" */ '@/views/Example/example-list/Index.vue'
                ),
            meta: {
                title: '示例列表',
                role: 'exampleList',
                requiresAuth: true,
            },
        },
    ],
}
