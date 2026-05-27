import { expect, test } from '@playwright/test'
import { LIST_MENU_CASES, mockMenuSmokeApis, setAuthCookie } from './helpers/mockMenuSmoke'
import { attachRuntimeGuard } from './helpers/runtimeGuard'

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe('list menu smoke', () => {
    for (const menu of LIST_MENU_CASES) {
        test(`menu ${menu.label} should render (${menu.path})`, async ({ page }) => {
            const runtime = attachRuntimeGuard(page)
            await mockMenuSmokeApis(page)
            await setAuthCookie(page)

            await page.goto(menu.path)

            await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/)
            await expect(page).not.toHaveURL(/\/error\/404(?:\?.*)?$/)
            await expect(page).toHaveURL(new RegExp(`${escapeForRegex(menu.path)}(?:\\?.*)?$`))

            const layout = page.locator('.arco-layout').first()
            await expect(layout).toBeVisible()
            await expect(layout.locator('.arco-layout-content').first()).toBeVisible()
            await expect(page.locator('.arco-table').first()).toBeVisible()

            runtime.assertNoRuntimeIssue()
        })
    }
})
