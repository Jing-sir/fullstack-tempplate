/**
 * 共享路由布局组件。
 * 顶级业务模块复用同一个 MainLayout 引用，避免跨模块跳转时布局壳被重复卸载/挂载。
 */
export const MainLayout = () => import('@/Main.vue');
