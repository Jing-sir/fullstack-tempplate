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
    await page.goto('/user/userList')

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
        page.getByText(/暂无权限,请咨询管理员|页面不存在或已失效|No permission, please contact the administrator/i),
    ).toBeVisible()

    runtime.assertNoRuntimeIssue()
})
