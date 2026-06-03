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
    const pagePermissionTrees = ref<Record<string, MenuItem[]>>({})
    const hasFetchedRoleMenu = ref<boolean>(false)
    let fetchSidebarPromise: Promise<void> | null = null
    let permissionGeneration = 0
    const fetchPagePromises = new Map<string, Promise<void>>()

    const flattenPermissionKeys = (items: MenuItem[]): string[] =>
        items.flatMap((item) => {
            const key = String(item.component || item.name || '')
            const children = item.children?.length
                ? flattenPermissionKeys(item.children as MenuItem[])
                : []
            return key ? [key, ...children] : children
        })

    const permissionKeySet = computed(
        () =>
            new Set([
                ...flattenPermissionKeys(roleMenu.value),
                ...Object.values(pagePermissionTrees.value).flatMap(flattenPermissionKeys),
            ]),
    )

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
            const permissionKey =
                typeof routeItem.meta?.permissionKey === 'string'
                    ? routeItem.meta.permissionKey
                    : routeName
            const ignorePermission = Boolean(routeItem.meta?.ignorePermission)

            if (routeItem.children?.length) {
                routeItem.children = getAsyRouter(routeItem.children, fetchRoleObj)
            }

            const hasAccessibleChildren = Boolean(routeItem.children?.length)
            return Boolean(
                ignorePermission ||
                    (permissionKey && fetchRoleObj[permissionKey]) ||
                    hasAccessibleChildren,
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

        const generation = permissionGeneration
        NProgress.start()
        // 打断 api/http/router/store 启动期循环依赖：
        // 仅在真正拉菜单时再动态加载 sysRoleApi。
        const request = import('@/api/sys/role')
            .then(({ default: roleApi }) => roleApi.menuList())
            .then((r) => {
                if (generation !== permissionGeneration) return
                const accessibleRoutes = filterAsyRouter(r)

                roleMenu.value = r
                pagePermissionTrees.value = {}
                routes.value = accessibleRoutes
                hasFetchedRoleMenu.value = true
            })
            .catch((error: unknown) => {
                if (generation !== permissionGeneration) return
                roleMenu.value = []
                pagePermissionTrees.value = {}
                routes.value = []
                hasFetchedRoleMenu.value = false
                // http 拦截器有具体报错时会先展示，这里只对空错误做统一兜底提示，避免重复弹窗。
                if (!String(error ?? '').trim()) {
                    Message.error(formatText('权限菜单加载失败，请稍后重试'))
                }
            })
            .finally(() => {
                if (fetchSidebarPromise === request) {
                    fetchSidebarPromise = null
                }
                NProgress.done()
            })

        fetchSidebarPromise = request
        return request
    }

    const fetchPagePermissions = (pageKey: string): Promise<void> => {
        if (!pageKey || Object.prototype.hasOwnProperty.call(pagePermissionTrees.value, pageKey)) {
            return Promise.resolve()
        }

        const existing = fetchPagePromises.get(pageKey)
        if (existing) return existing

        const generation = permissionGeneration
        const request = import('@/api/sys/role')
            .then(({ default: roleApi }) => roleApi.pagePermissionList(pageKey))
            .then((tree) => {
                if (generation !== permissionGeneration) return
                pagePermissionTrees.value = {
                    ...pagePermissionTrees.value,
                    [pageKey]: tree,
                }
            })
            .finally(() => {
                if (fetchPagePromises.get(pageKey) === request) {
                    fetchPagePromises.delete(pageKey)
                }
            })

        fetchPagePromises.set(pageKey, request)
        return request
    }

    const hasPermission = (permissionKey: string): boolean =>
        Boolean(permissionKey && permissionKeySet.value.has(permissionKey))

    const getPagePermissionTree = (pageKey: string): MenuItem[] =>
        pagePermissionTrees.value[pageKey] ?? []

    const resetPermissions = (): void => {
        permissionGeneration += 1
        roleMenu.value = []
        pagePermissionTrees.value = {}
        routes.value = []
        hasFetchedRoleMenu.value = false
        fetchSidebarPromise = null
        fetchPagePromises.clear()
    }

    const refreshPermissions = (): Promise<void> => {
        resetPermissions()
        return fetchSidebarRoutes()
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
        pagePermissionTrees,
        permissionKeySet,
        isSidebar,
        hasFetchedRoleMenu,
        hasPermission,
        getPagePermissionTree,
        fetchPagePermissions,
        resetPermissions,
        refreshPermissions,
        updateIsSidebar,
        fetchSidebarRoutes,
    }
})
