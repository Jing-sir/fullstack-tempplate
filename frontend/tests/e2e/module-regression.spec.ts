import { expect, type Page, test } from '@playwright/test'
import { LIST_MENU_CASES, mockMenuSmokeApis, setAuthCookie } from './helpers/mockMenuSmoke'
import { attachRuntimeGuard } from './helpers/runtimeGuard'

type ApiCounter = {
    getCount: () => number
}

const API_COUNT_IGNORE_PATTERNS = [
    /\/sysConfig\/pwdIv$/i,
    /\/sys\/user\/getInfo$/i,
    /\/sys\/menu\/list$/i,
    /\/sys\/role\/list$/i,
    /\/sys\/role\/getInfo$/i,
]

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createApiCounter(page: Page): ApiCounter {
    let count = 0

    page.on('request', (request) => {
        const url = request.url()
        if (!url.includes('/api/v1/')) return
        if (API_COUNT_IGNORE_PATTERNS.some((pattern) => pattern.test(url))) return
        count += 1
    })

    return {
        getCount: () => count,
    }
}

async function expectApiCountIncrease(counter: ApiCounter, before: number, message: string) {
    await expect
        .poll(() => counter.getCount(), {
            message,
            timeout: 8000,
        })
        .toBeGreaterThan(before)
}

async function openListPage(page: Page, path: string) {
    await page.goto(path)

    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/)
    await expect(page).not.toHaveURL(/\/error\/404(?:\?.*)?$/)
    await expect(page).toHaveURL(new RegExp(`${escapeForRegex(path)}(?:\\?.*)?$`))

    await expect(page.locator('.arco-layout').first()).toBeVisible()
    await expect(page.locator('.arco-table').first()).toBeVisible()
}

async function runSearchAndResetFlow(page: Page, counter: ApiCounter) {
    const searchButton = page.getByRole('button', { name: /^(搜索|Search)$/i }).first()
    const resetButton = page.getByRole('button', { name: /^(重置|Reset)$/i }).first()

    if (!(await searchButton.isVisible().catch(() => false))) {
        const moreFilterButton = page
            .getByRole('button', { name: /更多筛选|More filters/i })
            .first()
        if (await moreFilterButton.isVisible().catch(() => false)) {
            await moreFilterButton.click()
        }
    }

    if (await searchButton.isVisible().catch(() => false)) {
        const beforeSearch = counter.getCount()
        await searchButton.click()
        await expectApiCountIncrease(counter, beforeSearch, '点击搜索后未触发接口请求')

        if (await resetButton.isVisible().catch(() => false)) {
            const beforeReset = counter.getCount()
            await resetButton.click()
            await expectApiCountIncrease(counter, beforeReset, '点击重置后未触发接口请求')
        }
        return
    }

    const quickSearchInput = page
        .locator('input[placeholder*="搜索"], input[placeholder*="Search"]')
        .first()
    await expect(quickSearchInput).toBeVisible()

    const beforeTyping = counter.getCount()
    await quickSearchInput.fill('e2e-keyword')
    await expectApiCountIncrease(counter, beforeTyping, '输入快捷搜索后未触发接口请求')
}

async function runPermissionLabSearchAndResetFlow(page: Page) {
    const orderInput = page.getByPlaceholder(/搜索订单号|Search Order No\./i)

    await orderInput.fill('LAB-20260607-002')

    await expect(page.getByRole('row', { name: /LAB-20260607-002/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /LAB-20260607-001/ })).toHaveCount(0)
    await expect(page.getByRole('row', { name: /LAB-20260607-003/ })).toHaveCount(0)

    await page.getByRole('button', { name: /更多筛选|More Filters/i }).click()
    const resetButton = page.getByRole('button', { name: /^(重置|Reset)$/i })
    await resetButton.click()

    await expect(page.getByRole('row', { name: /LAB-20260607-001/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /LAB-20260607-002/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /LAB-20260607-003/ })).toBeVisible()
}

test.describe('module interaction regression', () => {
    for (const item of LIST_MENU_CASES) {
        if (item.path === '/systemManage/rolePermissions') {
            test(`${item.label} renders current module route`, async ({ page }) => {
                const runtime = attachRuntimeGuard(page)
                await mockMenuSmokeApis(page)
                await setAuthCookie(page)

                await openListPage(page, item.path)

                runtime.assertNoRuntimeIssue()
            })
            continue
        }

        test(`${item.label} supports search and reset flow`, async ({ page }) => {
            const runtime = attachRuntimeGuard(page)
            await mockMenuSmokeApis(
                page,
                item.role === 'permissionLabOrders'
                    ? {
                          permissionLabOrders: [
                              {
                                  id: '200',
                                  name: 'permissionLabOrders-tabAll',
                                  component: 'permissionLabOrders-tabAll',
                                  type: 5,
                              },
                          ],
                      }
                    : {},
            )
            await setAuthCookie(page)
            const apiCounter = createApiCounter(page)

            await openListPage(page, item.path)
            if (item.role === 'permissionLabOrders') {
                await runPermissionLabSearchAndResetFlow(page)
            } else {
                await runSearchAndResetFlow(page, apiCounter)
            }

            runtime.assertNoRuntimeIssue()
        })
    }
})
