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
