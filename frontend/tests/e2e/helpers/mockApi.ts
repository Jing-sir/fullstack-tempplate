import type { Page, Route } from '@playwright/test'

type MockPayload = {
    code: number
    data: unknown
    msg?: string
}

const json = (payload: MockPayload) => ({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(payload),
})

const fulfillOk = (route: Route, data: unknown) => route.fulfill(json({ code: 200, data }))

/**
 * 为 e2e smoke 提供稳定的启动期接口数据，避免依赖真实后端状态。
 */
export async function mockBootstrapApis(page: Page) {
    await page.route('**/api/v1/sysConfig/pwdIv**', (route) => fulfillOk(route, 'mock-pwd-iv'))

    await page.route('**/api/v1/sys/user/getInfo**', (route) =>
        fulfillOk(route, {
            account: 'e2e-admin',
            bindAccount: '',
            fullName: 'E2E Admin',
            isFACode: 0,
            roleId: '1',
            roleName: 'admin',
            state: 1,
            userId: 'e2e-user-id',
        }),
    )

    await page.route('**/api/v1/sys/menu/list**', (route) => fulfillOk(route, []))
}
