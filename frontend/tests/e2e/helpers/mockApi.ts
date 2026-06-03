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
    await page.route('**/api/v1/security/iv**', (route) =>
        fulfillOk(route, { iv_id: 'mock-iv-id', iv: '00112233445566778899aabb' }),
    )

    await page.route('**/api/v1/users**', (route) =>
        fulfillOk(route, {
            users: [
                {
                    uid: 'e2e-user-id',
                    username: 'e2e-admin',
                    two_fa_enabled: false,
                    status: 1,
                },
            ],
        }),
    )

    await page.route('**/api/v1/menus**', (route) => fulfillOk(route, []))
}
