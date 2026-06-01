import type { Router, RouteLocationNormalized, RouteLocationRaw } from 'vue-router' /// doc: https://router.vuejs.org/api
import { createRouter, createWebHistory } from 'vue-router' /// doc: https://router.vuejs.org/api
import { storeToRefs } from 'pinia'
import routes from '../routes'
import pinia from '../store/Index'
import useSidebar from '@/store/sideBar'
import type permissionApi from '@/api/permission'
import i18n, { setI18nLanguage } from './i18n-setup'
import { getManageToken } from '@/utils/session'

type GuardResult = boolean | string
type RouterGuardHandler = (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
) => Promise<GuardResult>
type PermissionMenuItem = PromiseReturnType<typeof permissionApi.homeMenu>[number]

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
            if (!requiresAuth) return true
            return `/login?redirect=${encodeURIComponent(to.fullPath || to.path || '/')}`
        }

        if (to.path === '/login') {
            return '/'
        }

        const store = useSidebar(pinia)
        const { hasFetchedRoleMenu, roleMenu } = storeToRefs(store)

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

        const permissionMenus = roleMenu.value as PermissionMenuItem[]

        // 菜单是树结构，需要递归把所有层级的 component 收集为权限 key
        const collectPermissions = (items: PermissionMenuItem[]): Record<string, string> => {
            const result: Record<string, string> = {}
            for (const item of items) {
                const key = String(item.component || item.name || '')
                if (key) result[key] = key
                const children = (item as unknown as { children?: PermissionMenuItem[] }).children
                if (children?.length) Object.assign(result, collectPermissions(children))
            }
            return result
        }
        const permissionMap = collectPermissions(permissionMenus)

        const routeRole = typeof to.name === 'string' ? to.name : ''
        if (!routeRole) return '/error'
        if (permissionMap[routeRole]) return true

        // isShow:true 的隐藏路由页（type=3）安全网：
        // 若该路由未在菜单表入库，向上找第一个有权限的非 isShow 父级放行。
        // 正常情况下 type=3 数据已入库，permissionMap 直接命中；此处仅作开发期降级兜底。
        if (to.meta.isShow) {
            const parentMatched = [...to.matched]
                .reverse()
                .find((r) => !r.meta?.isShow && permissionMap[String(r.name ?? '')])
            if (parentMatched) {
                console.warn(
                    `[router] isShow 路由 "${routeRole}" 未在菜单表中注册（type=3），` +
                    `已 fallback 到父级 "${String(parentMatched.name)}" 权限放行。请检查迁移 SQL 是否执行。`,
                )
                return true
            }
        }

        return buildNoPermissionPath(to, routeRole)
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
        return { path: redirectPath, replace: true }
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
