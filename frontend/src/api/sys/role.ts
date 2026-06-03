import { Api } from '../api'
import type { SystemRoleItem, TreeDataType } from '@/interface/SystemManageType'

export interface RoleMenuItem {
    id?: string | number
    menuId?: string | number
    parentId?: string | number
    name: string
    title?: string
    component: string
    type?: number
    path?: string
    children?: RoleMenuItem[]
}

export interface RoleInfoResult {
    roleId: string
    roleName: string
    remark?: string
    state?: number
}

export interface RoleAddUpdateParams {
    roleId?: string
    roleName: string
    remark?: string
    state?: number
    checkOpPassword?: boolean
    menuIdList?: Array<{ menuId: number; checkUserPassword?: number }>
}

const normalizeMenuItem = (item: Partial<RoleMenuItem>): RoleMenuItem => ({
    ...item,
    name: String(item.name ?? item.component ?? ''),
    component: String(item.component ?? item.name ?? ''),
    children: item.children?.map(normalizeMenuItem),
})

class SysRoleApi extends Api {
    /** 权限菜单树（侧栏用） */
    async menuList(): Promise<RoleMenuItem[]> {
        const result = await this.api.post<Partial<RoleMenuItem>[], Partial<RoleMenuItem>[]>(
            '/menus/list',
            {},
        )
        return Array.isArray(result) ? result.map(normalizeMenuItem) : []
    }

    /** 当前用户在指定菜单页下拥有的完整子权限树 */
    async pagePermissionList(pageKey: string): Promise<RoleMenuItem[]> {
        const result = await this.api.post<Partial<RoleMenuItem>[], Partial<RoleMenuItem>[]>(
            '/permissions/list',
            { parentKey: pageKey },
        )
        return Array.isArray(result) ? result.map(normalizeMenuItem) : []
    }

    /** 角色列表（用于下拉选择 / 角色管理列表） */
    async sysRoleList(): Promise<SystemRoleItem[]> {
        const result = await this.api.post<
            Array<Record<string, unknown>>,
            Array<Record<string, unknown>>
        >('/roles/list', {})
        // 后端返回 {roles: [...]} 或直接数组
        const list = Array.isArray(result)
            ? result
            : (((result as Record<string, unknown>).roles as Array<Record<string, unknown>>) ?? [])
        return list.map((r) => ({
            roleId: String(r.id ?? ''),
            roleName: String(r.title ?? r.name ?? ''),
        }))
    }

    /** 全量菜单树（角色权限配置用） */
    async sysRoleMenuList(): Promise<TreeDataType[]> {
        const result = await this.api.post<
            Array<Record<string, unknown>>,
            Array<Record<string, unknown>>
        >('/admin/menus/list', {})
        const list = Array.isArray(result) ? result : []
        const normalize = (item: Record<string, unknown>): TreeDataType => ({
            menuId: String(item.id ?? ''),
            menuName: String(item.title ?? item.name ?? ''),
            parentId: String(item.parent_id ?? '0'),
            type: typeof item.type === 'number' ? item.type : Number(item.type ?? 0),
            children: Array.isArray(item.children)
                ? (item.children as Array<Record<string, unknown>>).map(normalize)
                : undefined,
        })
        return list.map(normalize)
    }

    /** 角色已勾选的菜单 ID 列表 */
    async sysInfoCheckMenuList(params: { roleId: string }): Promise<TreeDataType[]> {
        const id = params.roleId
        const result = await this.api.get<Record<string, unknown>, Record<string, unknown>>(
            `/roles/menus/${encodeURIComponent(id)}`,
        )
        const ids: number[] = Array.isArray((result as Record<string, unknown>).menu_ids)
            ? ((result as Record<string, unknown>).menu_ids as number[])
            : []
        return ids.map((menuId) => ({
            menuId: String(menuId),
            menuName: '',
            parentId: '0',
        }))
    }

    /** 角色详情 */
    async sysRoleInfo(params: { roleId: string }): Promise<RoleInfoResult> {
        return this.api.get<RoleInfoResult, RoleInfoResult>(
            `/roles/info/${encodeURIComponent(params.roleId)}`,
        )
    }

    /** 新增/更新角色（含菜单权限） */
    async sysRoleAddUpdate(params: RoleAddUpdateParams): Promise<void> {
        await this.api.post<void, void, RoleAddUpdateParams>('/roles/add-update', params)
    }
}

export default new SysRoleApi()
