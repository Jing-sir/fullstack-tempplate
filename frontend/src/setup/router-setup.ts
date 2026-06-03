import type { Router, RouteLocationNormalized, RouteLocationRaw } from 'vue-router' /// doc: https://router.vuejs.org/api
import { createRouter, createWebHistory } from 'vue-router' /// doc: https://router.vuejs.org/api
import { storeToRefs } from 'pinia'
import routes from '../routes'
import pinia from '../store/Index'
import useSidebar from '@/store/sideBar'
import i18n, { setI18nLanguage } from './i18n-setup'
import { getManageToken } from '@/utils/session'

type GuardResult = boolean | string
type RouterGuardHandler = (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
) => Promise<GuardResult>

const TITLE = window.document.title
const buildNoPermissionPath = (to: RouteLocationNormalized, role: string): string => {
    const redirect = encodeURIComponent(to.fullPath || to.path || '/')
    const roleQuery = role ? `&role=${encodeURIComponent(role)}` : ''

    return `/error/no-permission?redirect=${redirect}${roleQuery}`
}
const LOCALE_MAP = Object.fromEntries(
    i18n.global.availableLocales.map((locale) => [String(locale).toLowerCase(), String(locale)]),
)

const router: Router = createRouter({
    history:
        createWebHistory(/* process.env.BASE_URL  适用于OSS/CDN，process.env.BASE_URL仅适用于开发部署 */),
    routes,
    scrollBehavior() {
        return { top: 0 }
    },
})

const routerGuards: Record<string, RouterGuardHandler> = {
    async setLanguage({ meta, path }): Promise<boolean> {
        const metaLang = typeof meta.lang === 'string' ? meta.lang : ''
        const routeLangKey = Object.keys(LOCALE_MAP).find((locale) =>
            new RegExp(`^/${locale}`, 'i').test(path),
        )
        const nextLang = metaLang || routeLangKey

        if (nextLang) {
            const matchedLang = LOCALE_MAP[nextLang.toLowerCase()] ?? nextLang
            setI18nLanguage(matchedLang as Parameters<typeof setI18nLanguage>[0])
        }

        return true
    },

    async setTitle({ meta }): Promise<boolean> {
        const routeTitle = typeof meta.title === 'function' ? meta.title() : meta.title
        window.document.title = routeTitle ? String(i18n.global.t(String(routeTitle))) : TITLE
        return true
    },

    async setRequiresAuth(to): Promise<GuardResult> {
        const hasToken = Boolean(getManageToken())
        const requiresAuth = Boolean(to.meta.requiresAuth)
        const ignorePermission = Boolean(to.meta.ignorePermission)

        // 未登录访问受保护路由时，统一跳转登录页并保留目标地址，登录后可回跳。
        if (!hasToken) {
            useSidebar(pinia).resetPermissions()
            if (!requiresAuth) return true
            return `/login?redirect=${encodeURIComponent(to.fullPath || to.path || '/')}`
        }

        if (to.path === '/login') {
            return '/'
        }

        const store = useSidebar(pinia)
        const { hasFetchedRoleMenu } = storeToRefs(store)

        if (requiresAuth && !ignorePermission && !hasFetchedRoleMenu.value) {
            await store.fetchSidebarRoutes()
        }

        if (!getManageToken()) {
            return `/login?redirect=${encodeURIComponent(to.fullPath || to.path || '/')}`
        }

        if (!requiresAuth) return true
        // 支持路由级别跳过权限菜单校验，常用于首页总览等公共工作台。
        if (ignorePermission) return true
        if (!hasFetchedRoleMenu.value) return '/error'

        const routePermissionKey =
            typeof to.meta.permissionKey === 'string'
                ? to.meta.permissionKey
                : typeof to.name === 'string'
                  ? to.name
                  : ''
        const permissionParent =
            typeof to.meta.permissionParent === 'string' ? to.meta.permissionParent : ''

        if (!routePermissionKey) return '/error'

        if (permissionParent) {
            // 页面子权限接口只允许拥有父列表页权限的用户调用。
            // 直接在地址栏输入新增、编辑 URL 时，也必须先加载父页面子树再严格校验业务权限 key。
            if (!store.hasPermission(permissionParent)) {
                return buildNoPermissionPath(to, routePermissionKey)
            }
            try {
                await store.fetchPagePermissions(permissionParent)
            } catch {
                if (!getManageToken()) {
                    return `/login?redirect=${encodeURIComponent(to.fullPath || to.path || '/')}`
                }
                return '/error'
            }
        }

        if (store.hasPermission(routePermissionKey)) return true
        return buildNoPermissionPath(to, routePermissionKey)
    },

    async setRedirect(to, from): Promise<GuardResult> {
        const { redirection } = to.meta

        if (typeof redirection === 'function') {
            return redirection.call(router, to, from)
        }

        return redirection ?? true
    },
}

router.beforeEach(async (to, from): Promise<RouteLocationRaw | boolean> => {
    const responses = await Promise.all(Object.values(routerGuards).map((guard) => guard(to, from)))

    const redirectPath = [...responses]
        .reverse()
        // 遵循原有的后定义守卫优先级，最后一个命中的字符串重定向优先生效。
        .find((result): result is string => typeof result === 'string' && Boolean(result))

    if (redirectPath) {
        const resolvedRedirect = router.resolve(redirectPath)
        return {
            path: resolvedRedirect.path,
            query: resolvedRedirect.query,
            hash: resolvedRedirect.hash,
            replace: true,
        }
    }

    if (responses.some((result) => result === false)) {
        return false
    }

    return true
})

router.afterEach((): void => {
    const el = document.getElementById('app')
    if (el) {
        el.scrollTop = 0
    }
})

type CurrentRouteState = typeof router.currentRoute.value

export const route = Object.keys(router.currentRoute.value).reduce(
    (acc, cur) =>
        Object.defineProperty(acc, cur, {
            enumerable: true,
            get: () => router.currentRoute.value[cur as keyof CurrentRouteState],
        }),
    Object.create(null) as Record<string, unknown>,
) as unknown as CurrentRouteState

export default router

declare module 'vue-router' {
    interface RouteMeta {
        lang?: string
        title?: string | (() => string)
        requiresAuth?: boolean
        ignorePermission?: boolean
        isShow?: boolean
        role?: string
        permissionKey?: string
        permissionParent?: string
        icon?: string
        hidden?: boolean
        redirection?:
            | string
            | ((
                  this: Router,
                  to: RouteLocationNormalized,
                  from: RouteLocationNormalized,
              ) => GuardResult)
    }
}
