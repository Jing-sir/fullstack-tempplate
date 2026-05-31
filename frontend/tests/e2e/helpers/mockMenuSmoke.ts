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

const menuRoles = [
    'userList',
    'labelList',
    'kolList',
    'userAuthentication',
    'userWhiteList',
    'cancellationApplication',
    'userLoginLog',
    'addressList',
    'transactionManagement',
    'orderManagement',
    'tariffManagement',
    'transactionLimitManagement',
    'invitationRebate',
    'invitationRebateSettings',
    'assetList',
    'userAssetList',
    'userAssetsJournal',
    'transfer',
    'assetFreeze',
    'assetFreezeHistory',
    'userFiatAssetList',
    'userFiatAssetJournal',
    'operationLog',
    'rolePermissions',
    'accountManage',
    'rebateBusinessConfiguration',
    'agentCardOpeningConfiguration',
    'invitationList',
]

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
    { label: '用户管理', path: '/user/userList', role: 'userList' },
    { label: '标签管理', path: '/user/labelList', role: 'labelList' },
    { label: 'KOL列表', path: '/user/kolList', role: 'kolList' },
    { label: '用户信息认证', path: '/user/user-auth', role: 'userAuthentication' },
    { label: '用户认证等级白名单', path: '/user/user-whitelist', role: 'userWhiteList' },
    { label: '注销申请', path: '/user/cancellationApplication', role: 'cancellationApplication' },
    { label: '用户登录日志', path: '/user/userLoginLog', role: 'userLoginLog' },
    { label: '地址列表', path: '/userAddress/addressList', role: 'addressList' },
    { label: '交易对管理', path: '/flashExchange/transactionManagement', role: 'transactionManagement' },
    { label: '订单管理', path: '/flashExchange/orderManagement', role: 'orderManagement' },
    { label: '费率管理', path: '/flashExchange/tariffManagement', role: 'tariffManagement' },
    { label: '交易限额限次管理', path: '/flashExchange/transactionLimitManagement', role: 'transactionLimitManagement' },
    { label: '邀请返佣', path: '/invitation-rebate-manage/invitationRebate', role: 'invitationRebate' },
    { label: '邀请返佣设置表', path: '/invitation-rebate-manage/invitationRebateSettings', role: 'invitationRebateSettings' },
    { label: '代理商资产', path: '/asset/assetList', role: 'assetList' },
    { label: '用户资产', path: '/asset/userAssetList', role: 'userAssetList' },
    { label: '用户资产流水', path: '/asset/userAssetsJournal', role: 'userAssetsJournal' },
    { label: '划转记录', path: '/asset/transfer', role: 'transfer' },
    { label: '用户资产冻结表', path: '/asset/assetFreeze', role: 'assetFreeze' },
    { label: '用户资产冻结历史', path: '/asset/assetFreezeHistory', role: 'assetFreezeHistory' },
    { label: '用户法币资产', path: '/asset/userFiatAssetList', role: 'userFiatAssetList' },
    { label: '用户法币资产流水', path: '/asset/userFiatAssetJournal', role: 'userFiatAssetJournal' },
    { label: '操作日志', path: '/systemManage/operationLog', role: 'operationLog' },
    { label: '角色权限管理', path: '/systemManage/rolePermissions', role: 'rolePermissions' },
    { label: '账号管理', path: '/systemManage/accountManage', role: 'accountManage' },
    { label: '返佣业务配置', path: '/kolConfiguration/rebateBusinessConfiguration', role: 'rebateBusinessConfiguration' },
    { label: 'KOL开卡配置', path: '/kolConfiguration/agentCardOpeningConfiguration', role: 'agentCardOpeningConfiguration' },
    { label: 'KOL申请列表', path: '/kolConfiguration/invitationList', role: 'invitationList' },
]

function fulfill(route: Route, data: unknown) {
    return route.fulfill(success(data))
}

function isArrayEndpoint(pathname: string): boolean {
    return /(typeList|enum|dict|options|allCoin|allAgent|currency|coinListSel|agent\/choose|ditchInfo|getTrade|tag\/list|menu\/permissions\/list|menu\/permissions\/check\/list)/i.test(pathname)
}

function isTableEndpoint(pathname: string): boolean {
    return /(?:^|\/)(list|List)$/.test(pathname) || /(?:^|\/).*(List)$/.test(pathname)
}

/**
 * 针对列表页 smoke 的统一接口桩：
 * - 覆盖启动所需接口（security/iv、users、menus）
 * - 其余 /api/v1/* 默认返回空表格或空对象，保证页面可挂载
 */
export async function mockMenuSmokeApis(page: Page) {
    await page.route('**/api/v1/**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const pathname = url.pathname

        if (pathname.endsWith('/security/iv')) {
            return fulfill(route, { iv_id: 'mock-iv-id', iv: 'mock-pwd-iv' })
        }

        if (pathname.endsWith('/users')) {
            return fulfill(route, {
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

        if (pathname.endsWith('/menus')) {
            return fulfill(route, menuList)
        }

        if (pathname.endsWith('/sys/role/list')) {
            return fulfill(route, [])
        }

        if (pathname.endsWith('/sys/role/getInfo')) {
            return fulfill(route, {
                roleId: '1',
                roleName: 'E2E Role',
                remark: '',
                menuIdList: [],
            })
        }

        if (pathname.endsWith('/login')) {
            return fulfill(route, {
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
            return fulfill(route, {})
        }

        if (pathname.includes('AmountTotal')) {
            return fulfill(route, {})
        }

        if (isArrayEndpoint(pathname)) {
            return fulfill(route, [])
        }

        if (isTableEndpoint(pathname)) {
            return fulfill(route, tableData)
        }

        return fulfill(route, {})
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
