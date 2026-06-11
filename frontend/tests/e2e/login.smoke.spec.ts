import { expect, test } from '@playwright/test'
import { attachRuntimeGuard } from './helpers/runtimeGuard'
import { mockBootstrapApis } from './helpers/mockApi'

test('login page renders core fields', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /Welcome back|欢迎回来/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Please enter account|请输入账号/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Please enter password|请输入密码/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Log In|登录/i })).toBeVisible()

    runtime.assertNoRuntimeIssue()
})

test('login form validation works without backend dependency', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page.goto('/login')
    await page.getByRole('button', { name: /Log In|登录/i }).click()

    await expect(page.getByText(/Please enter account|请输入账号/i)).toBeVisible()
    await expect(page.getByText(/Please enter password|请输入密码/i)).toBeVisible()

    runtime.assertNoRuntimeIssue()
})

test('unauthenticated user is redirected to login page', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page.goto('/systemManage/editRolePermissions/2')

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await expect(page.getByRole('button', { name: /Log In|登录/i })).toBeVisible()

    runtime.assertNoRuntimeIssue()
})

test('unknown route falls back to /error/404 page', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page.goto('/this-route-should-not-exist')

    await expect(page).toHaveURL(/\/error\/404/)
    await expect(
        page.getByText(
            /暂无权限,请咨询管理员|页面不存在或已失效|No permission, please contact the administrator/i,
        ),
    ).toBeVisible()

    runtime.assertNoRuntimeIssue()
})

test('unbound account login opens mandatory 2FA setup modal', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page.route('**/api/v1/login', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
                code: 200,
                data: {
                    token: 'setup-token',
                    twoFaSetupRequired: true,
                    user: { uid: 'e2e-user-id', username: 'e2e-admin', status: 1 },
                },
            }),
        }),
    )
    await page.route('**/api/v1/user/2fa/setup', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
                code: 200,
                data: { secret: 'TESTSECRET', otp_auth_url: 'otpauth://totp/test' },
            }),
        }),
    )
    await page.goto('/login')
    await page.getByPlaceholder(/Please enter account|请输入账号/i).fill('e2e-admin')
    await page.getByPlaceholder(/Please enter password|请输入密码/i).fill('secret')
    await page.getByRole('button', { name: /Log In|登录/i }).click()

    await expect(page.getByText(/Set 2FA|设置2FA/i)).toBeVisible()
    await expect(page.locator('input[disabled]')).toHaveValue('TESTSECRET')
    await page.getByRole('button', { name: /Verify|验证/i }).click()
    await expect(
        page.locator('.arco-modal:visible').getByText(/2FA Verification|2FA验证/i),
    ).toBeVisible()
    await expect(page.locator('.google-code-input:visible input')).toHaveCount(6)

    runtime.assertNoRuntimeIssue()
})

test('bound account login opens 2FA verification modal', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page.route('**/api/v1/login', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ code: 200, data: { twoFaRequired: true } }),
        }),
    )
    await page.goto('/login')
    await page.getByPlaceholder(/Please enter account|请输入账号/i).fill('e2e-admin')
    await page.getByPlaceholder(/Please enter password|请输入密码/i).fill('secret')
    await page.getByRole('button', { name: /Log In|登录/i }).click()

    await expect(
        page.locator('.arco-modal:visible').getByText(/2FA Verification|2FA验证/i),
    ).toBeVisible()
    await expect(page.locator('.google-code-input:visible input')).toHaveCount(6)

    runtime.assertNoRuntimeIssue()
})

test('legacy unbound session is redirected to login for mandatory 2FA setup', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)

    await mockBootstrapApis(page)
    await page
        .context()
        .addCookies([{ name: 'manageToken', value: 'legacy-token', url: 'http://127.0.0.1:60001' }])
    await page.route('**/api/v1/menus/list', (route) =>
        route.fulfill({
            status: 403,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ code: 403, msg: '请先完成 2FA 绑定', data: null }),
        }),
    )
    await page.goto('/systemManage/accountManage')

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await expect(page.getByRole('button', { name: /Log In|登录/i })).toBeVisible()

    runtime.assertNoRuntimeIssue()
})
