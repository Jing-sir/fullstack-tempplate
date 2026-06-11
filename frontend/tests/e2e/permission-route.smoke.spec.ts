import { expect, test } from '@playwright/test'
import { attachRuntimeGuard } from './helpers/runtimeGuard'
import { mockMenuSmokeApis, setAuthCookie } from './helpers/mockMenuSmoke'

test('parent list permission does not grant hidden edit page', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)
    await mockMenuSmokeApis(page)
    await setAuthCookie(page)

    await page.goto('/systemManage/editRolePermissions/2')

    await expect(page).toHaveURL(/\/error\/no-permission(?:\?.*)?$/)
    await expect(page.getByText(/暂无权限|No permission/i)).toBeVisible()
    runtime.assertNoRuntimeIssue()
})

test('explicit hidden edit permission grants direct page access', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)
    await mockMenuSmokeApis(page, {
        rolePermissions: [
            {
                id: '100',
                name: 'rolePermissions-edit',
                component: 'rolePermissions-edit',
                type: 3,
            },
        ],
    })
    await setAuthCookie(page)

    await page.goto('/systemManage/editRolePermissions/2')

    await expect(page).toHaveURL(/\/systemManage\/editRolePermissions\/2$/)
    await expect(page).not.toHaveURL(/\/error\/no-permission(?:\?.*)?$/)
    runtime.assertNoRuntimeIssue()
})

test('permission lab only renders granted tab and tab button', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)
    await mockMenuSmokeApis(page, {
        permissionLabOrders: [
            {
                id: '200',
                name: 'permissionLabOrders-tabReview',
                component: 'permissionLabOrders-tabReview',
                type: 5,
                children: [
                    {
                        id: '201',
                        name: 'permissionLabOrders-approve',
                        component: 'permissionLabOrders-approve',
                        type: 4,
                    },
                ],
            },
        ],
    })
    await setAuthCookie(page)

    await page.goto('/permissionLab/orders')

    const tabs = page.locator('.arco-tabs')
    await expect(tabs.getByText(/待审核|Pending Review/i, { exact: true })).toBeVisible()
    await expect(tabs.getByText(/全部订单|All Orders/i, { exact: true })).toHaveCount(0)
    await expect(tabs.getByText(/已完成|Completed/i, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /审核通过|Approve/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /审核驳回|Reject/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /新增订单|Add Order/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /导出订单|Export Orders/i })).toHaveCount(0)
    await expect(page.locator('.arco-table')).toBeVisible()

    runtime.assertNoRuntimeIssue()
})

test('permission lab list permission does not grant hidden detail page', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)
    await mockMenuSmokeApis(page, {
        permissionLabOrders: [
            {
                id: '200',
                name: 'permissionLabOrders-tabAll',
                component: 'permissionLabOrders-tabAll',
                type: 5,
            },
        ],
    })
    await setAuthCookie(page)

    await page.goto('/permissionLab/orderDetail/LAB-20260607-001')

    await expect(page).toHaveURL(/\/error\/no-permission(?:\?.*)?$/)
    await expect(page.getByText(/暂无权限|No permission/i)).toBeVisible()
    runtime.assertNoRuntimeIssue()
})

test('permission lab explicit detail permission grants direct access', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)
    await mockMenuSmokeApis(page, {
        permissionLabOrders: [
            {
                id: '202',
                name: 'permissionLabOrders-detail',
                component: 'permissionLabOrders-detail',
                type: 3,
            },
        ],
    })
    await setAuthCookie(page)

    await page.goto('/permissionLab/orderDetail/LAB-20260607-001')

    await expect(page).toHaveURL(/\/permissionLab\/orderDetail\/LAB-20260607-001$/)
    await expect(page.getByText('LAB-20260607-001').first()).toBeVisible()
    runtime.assertNoRuntimeIssue()
})

test('permission version change refreshes sidebar cache', async ({ page }) => {
    const runtime = attachRuntimeGuard(page)
    let permissionVersion = '1'
    let menuListRequests = 0

    await mockMenuSmokeApis(page, {}, {
        permissionVersion: () => permissionVersion,
        onMenuList: () => {
            menuListRequests += 1
        },
    })
    await setAuthCookie(page)

    await page.goto('/systemManage/accountManage')
    await expect.poll(() => menuListRequests).toBe(1)

    permissionVersion = '2'
    const searchInput = page.getByPlaceholder(/搜索管理员账号|Search Admin Account/i)
    await searchInput.fill('alice')
    await searchInput.press('Enter')

    await expect.poll(() => menuListRequests).toBe(2)
    await expect
        .poll(() => page.evaluate(() => sessionStorage.getItem('managePermissionVersion')))
        .toBe('2')
    runtime.assertNoRuntimeIssue()
})

test('admin menu tree version change also refreshes sidebar cache', async ({ page }) => {
    let permissionVersion = '1'
    let menuListRequests = 0

    await mockMenuSmokeApis(
        page,
        {
            rolePermissions: [
                {
                    id: '100',
                    name: 'rolePermissions-edit',
                    component: 'rolePermissions-edit',
                    type: 3,
                },
                {
                    id: '101',
                    name: 'rolePermissions-menuManage',
                    component: 'rolePermissions-menuManage',
                    type: 4,
                },
            ],
        },
        {
            permissionVersion: () => permissionVersion,
            onMenuList: () => {
                menuListRequests += 1
            },
        },
    )
    await setAuthCookie(page)

    await page.goto('/systemManage/accountManage')
    await expect.poll(() => menuListRequests).toBe(1)

    permissionVersion = '2'
    await page.goto('/systemManage/editRolePermissions/2')
    const runtime = attachRuntimeGuard(page)

    await expect(page).toHaveURL(/\/systemManage\/editRolePermissions\/2$/)
    await expect.poll(() => menuListRequests).toBeGreaterThan(1)
    await expect
        .poll(() => page.evaluate(() => sessionStorage.getItem('managePermissionVersion')))
        .toBe('2')
    runtime.assertNoRuntimeIssue()
})
