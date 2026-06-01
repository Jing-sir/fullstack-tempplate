import permissionRoutes from '../routes/permissionRoutes'
import type { RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import { Message } from '@arco-design/web-vue'
import type sysRoleApi from '@/api/sys/role'
import { formatText } from '@/utils/common'

type MenuItem = PromiseReturnType<typeof sysRoleApi.menuList>[number]

export default defineStore('sideBar', () => {
    const isSidebar = ref<boolean>(false) // 侧边栏开关状态
    const routes = ref<Array<RouteRecordRaw>>([]) // 路由权限列表
    const roleMenu = ref<MenuItem[]>([])
    const hasFetchedRoleMenu = ref<boolean>(false)
    let fetchSidebarPromise: Promise<void> | null = null

    const updateIsSidebar = (status: boolean): void => {
        // 更新isSidebar状态
        isSidebar.value = status
    }

    const getAsyRouter = (
        routeList: RouteRecordRaw[],
        fetchRoleObj: Record<string, string>,
    ): RouteRecordRaw[] =>
        routeList.filter((routeItem) => {
            const routeName = typeof routeItem.name === 'string' ? routeItem.name : ''
            const ignorePermission = Boolean(routeItem.meta?.ignorePermission)

            if (routeItem.children?.length) {
                routeItem.children = getAsyRouter(routeItem.children, fetchRoleObj)
            }

            const hasAccessibleChildren = Boolean(routeItem.children?.length)
            return Boolean(
                ignorePermission || (routeName && fetchRoleObj[routeName]) || hasAccessibleChildren,
            )
        })

    // 遍历后台传来的路由字符串，转换为组件对象
    const filterAsyRouter = (roleList: MenuItem[]): RouteRecordRaw[] => {
        // 菜单是树结构，需要递归把所有层级的 component 铺平成 key-value 对象
        // type=4（按钮，name 格式为 routeName-action）不对应路由，跳过，避免误混入路由过滤
        const collectComponents = (items: MenuItem[]): Record<string, string> => {
            const result: Record<string, string> = {}
            for (const item of items) {
                if ((item as MenuItem & { type?: number }).type === 4) continue
                const key = item.component || item.name
                if (key) result[key] = key
                if (item.children?.length) {
                    Object.assign(result, collectComponents(item.children as MenuItem[]))
                }
            }
            return result
        }
        const fetchRoleObj = collectComponents(roleList)
        return getAsyRouter(JSON.parse(JSON.stringify(permissionRoutes)), fetchRoleObj)
    }

    // 获取sidebar 列表路由
    const fetchSidebarRoutes = (): Promise<void> => {
        // 路由快速切换时可能触发并发拉取，这里统一复用同一请求，避免重复覆盖状态。
        if (fetchSidebarPromise) return fetchSidebarPromise

        NProgress.start()
        // 打断 api/http/router/store 启动期循环依赖：
        // 仅在真正拉菜单时再动态加载 sysRoleApi。
        const request = import('@/api/sys/role')
            .then(({ default: roleApi }) => roleApi.menuList())
            .then((r) => {
                const accessibleRoutes = filterAsyRouter(r)

                roleMenu.value = r
                routes.value = accessibleRoutes
                hasFetchedRoleMenu.value = true
            })
            .catch((error: unknown) => {
                roleMenu.value = []
                routes.value = []
                hasFetchedRoleMenu.value = false
                // http 拦截器有具体报错时会先展示，这里只对空错误做统一兜底提示，避免重复弹窗。
                if (!String(error ?? '').trim()) {
                    Message.error(formatText('权限菜单加载失败，请稍后重试'))
                }
            })
            .finally(() => {
                fetchSidebarPromise = null
                NProgress.done()
            })

        fetchSidebarPromise = request
        return request
    }

    /* const onRefreshToken = (val: number): void => {
        const curTime = Number(sessionStorage.getItem('expireTime'));
        const expireTime = curTime - 10 * 60 * 1000;
        if (val >= expireTime) {
            userApi.refreshToken({ refreshToken: String(sessionStorage.getItem('refresh')) }).then((r) => {
                sessionStorage.setItem('expireTime', String(r.expireTime));
                sessionStorage.setItem('refresh', r.refreshToken);
                cookies('waasToken', r.accessToken);
            });
        }
    }; */

    return {
        routes,
        roleMenu,
        isSidebar,
        hasFetchedRoleMenu,
        updateIsSidebar,
        fetchSidebarRoutes,
    }
})
