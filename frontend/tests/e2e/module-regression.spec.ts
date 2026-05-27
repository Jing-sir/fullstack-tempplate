import { expect, type Page, test } from '@playwright/test'
import { mockMenuSmokeApis, setAuthCookie } from './helpers/mockMenuSmoke'
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
        const moreFilterButton = page.getByRole('button', { name: /更多筛选|More filters/i }).first()
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

test.describe('module interaction regression', () => {
    test('user module supports search and reset flow', async ({ page }) => {
        const runtime = attachRuntimeGuard(page)
        await mockMenuSmokeApis(page)
        await setAuthCookie(page)
        const apiCounter = createApiCounter(page)

        await openListPage(page, '/user/userList')
        await runSearchAndResetFlow(page, apiCounter)

        runtime.assertNoRuntimeIssue()
    })

    test('flash exchange order module supports tab switch flow', async ({ page }) => {
        const runtime = attachRuntimeGuard(page)
        await mockMenuSmokeApis(page)
        await setAuthCookie(page)
        const apiCounter = createApiCounter(page)

        await openListPage(page, '/flashExchange/orderManagement')
        await runSearchAndResetFlow(page, apiCounter)

        const historyTab = page.getByRole('tab', { name: /历史委托|History/i })
        const detailTab = page.getByRole('tab', { name: /成交详情|Detail/i })

        const beforeHistoryTab = apiCounter.getCount()
        await historyTab.click()
        await expect(historyTab).toHaveAttribute('aria-selected', 'true')
        await expectApiCountIncrease(apiCounter, beforeHistoryTab, '切换到历史委托后未触发接口请求')

        const beforeDetailTab = apiCounter.getCount()
        await detailTab.click()
        await expect(detailTab).toHaveAttribute('aria-selected', 'true')
        await expectApiCountIncrease(apiCounter, beforeDetailTab, '切换到成交详情后未触发接口请求')
        await expect(page.locator('.arco-table').first()).toBeVisible()

        runtime.assertNoRuntimeIssue()
    })

    test('invitation rebate module supports search and reset flow', async ({ page }) => {
        const runtime = attachRuntimeGuard(page)
        await mockMenuSmokeApis(page)
        await setAuthCookie(page)
        const apiCounter = createApiCounter(page)

        await openListPage(page, '/invitation-rebate-manage/invitationRebate')
        await runSearchAndResetFlow(page, apiCounter)

        runtime.assertNoRuntimeIssue()
    })

    test('asset module supports search and reset flow', async ({ page }) => {
        const runtime = attachRuntimeGuard(page)
        await mockMenuSmokeApis(page)
        await setAuthCookie(page)
        const apiCounter = createApiCounter(page)

        await openListPage(page, '/asset/userAssetList')
        await runSearchAndResetFlow(page, apiCounter)

        runtime.assertNoRuntimeIssue()
    })

    test('system module supports search and reset flow', async ({ page }) => {
        const runtime = attachRuntimeGuard(page)
        await mockMenuSmokeApis(page)
        await setAuthCookie(page)
        const apiCounter = createApiCounter(page)

        await openListPage(page, '/systemManage/operationLog')
        await runSearchAndResetFlow(page, apiCounter)

        runtime.assertNoRuntimeIssue()
    })

    test('kol module supports search and reset flow', async ({ page }) => {
        const runtime = attachRuntimeGuard(page)
        await mockMenuSmokeApis(page)
        await setAuthCookie(page)
        const apiCounter = createApiCounter(page)

        await openListPage(page, '/kolConfiguration/invitationList')
        await runSearchAndResetFlow(page, apiCounter)

        runtime.assertNoRuntimeIssue()
    })
})
