import type { Page, Route } from '@playwright/test'

type MenuCase = {
    label: string
    path: string
    role: string
}

const tableData = {
    list: [],
    pageNo: 1,
    pageSize: 20,
    totalPages: 0,
    totalSize: 0,
}

const success = (data: unknown) => ({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({
        code: 200,
        data,
        msg: 'ok',
    }),
})

interface MockMenuSmokeOptions {
    permissionVersion?: () => string
    onMenuList?: () => void
}

const menuRoles = ['systemManage', 'operationLog', 'rolePermissions', 'accountManage']

const menuList = menuRoles.map((role, index) => ({
    id: String(index + 1),
    name: role,
    component: role,
    type: '1',
    path: role,
    title: role,
    route: role,
    parentId: '0',
}))

export const LIST_MENU_CASES: MenuCase[] = [
    { label: '操作日志', path: '/systemManage/operationLog', role: 'operationLog' },
    { label: '角色权限管理', path: '/systemManage/rolePermissions', role: 'rolePermissions' },
    { label: '账号管理', path: '/systemManage/accountManage', role: 'accountManage' },
]

function fulfill(route: Route, data: unknown, headers: Record<string, string> = {}) {
    return route.fulfill({
        ...success(data),
        headers,
    })
}

function isArrayEndpoint(pathname: string): boolean {
    return /(typeList|enum|dict|options|allCoin|allAgent|currency|coinListSel|agent\/choose|ditchInfo|getTrade|tag\/list|menu\/permissions\/list|menu\/permissions\/check\/list)/i.test(
        pathname,
    )
}

function isTableEndpoint(pathname: string): boolean {
    return /(?:^|\/)(list|List)$/.test(pathname) || /(?:^|\/).*(List)$/.test(pathname)
}

/**
 * 针对列表页 smoke 的统一接口桩：
 * - 覆盖启动所需接口（security/iv、users、menus）
 * - 其余 /api/v1/* 默认返回空表格或空对象，保证页面可挂载
 */
export async function mockMenuSmokeApis(
    page: Page,
    pagePermissions: Record<string, unknown[]> = {},
    options: MockMenuSmokeOptions = {},
) {
    const fulfillCurrent = (route: Route, data: unknown) =>
        fulfill(
            route,
            data,
            options.permissionVersion
                ? { 'X-Permission-Version': options.permissionVersion() }
                : {},
        )

    await page.route('**/api/v1/**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const pathname = url.pathname

        if (pathname.endsWith('/security/iv')) {
            return fulfillCurrent(route, { iv_id: 'mock-iv-id', iv: '00112233445566778899aabb' })
        }

        if (pathname.endsWith('/users')) {
            return fulfillCurrent(route, {
                users: [
                    {
                        uid: 'e2e-user-id',
                        username: 'e2e-admin',
                        two_fa_enabled: false,
                        status: 1,
                    },
                ],
            })
        }

        if (pathname === '/api/v1/menus/list') {
            options.onMenuList?.()
            return fulfillCurrent(route, menuList)
        }

        if (pathname === '/api/v1/permissions/list') {
            const body = request.postDataJSON() as { parentKey?: unknown } | null
            const parentKey = typeof body?.parentKey === 'string' ? body.parentKey : ''
            return fulfillCurrent(route, pagePermissions[parentKey] ?? [])
        }

        if (pathname.endsWith('/sys/role/list')) {
            return fulfillCurrent(route, [])
        }

        if (pathname.endsWith('/sys/role/getInfo')) {
            return fulfillCurrent(route, {
                roleId: '1',
                roleName: 'E2E Role',
                remark: '',
                menuIdList: [],
            })
        }

        if (pathname.endsWith('/login')) {
            return fulfillCurrent(route, {
                token: 'mock-manage-token',
                twoFaRequired: false,
                twoFaSetupRequired: false,
                user: {
                    uid: 'e2e-user-id',
                    username: 'e2e-admin',
                    two_fa_enabled: false,
                    status: 1,
                },
            })
        }

        if (pathname.includes('/export') || pathname.includes('/excelWriter')) {
            return fulfillCurrent(route, {})
        }

        if (pathname.includes('AmountTotal')) {
            return fulfillCurrent(route, {})
        }

        if (isArrayEndpoint(pathname)) {
            return fulfillCurrent(route, [])
        }

        if (isTableEndpoint(pathname)) {
            return fulfillCurrent(route, tableData)
        }

        return fulfillCurrent(route, {})
    })
}

export async function setAuthCookie(page: Page) {
    await page.context().addCookies([
        {
            name: 'manageToken',
            value: 'mock-manage-token',
            domain: '127.0.0.1',
            path: '/',
            httpOnly: false,
            secure: false,
        },
    ])
}
