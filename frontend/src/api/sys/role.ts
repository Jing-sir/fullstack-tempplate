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

export type PermissionMenuType = 1 | 2 | 3 | 4 | 5

export interface PermissionMenuNode {
    id: number
    parentId: number
    name: string
    title: string
    type: PermissionMenuType
    icon: string
    sort: number
    status: number
    protected: boolean
    children?: PermissionMenuNode[]
}

export interface CreatePermissionMenuParams {
    parent_id: number
    name: string
    title: string
    type: PermissionMenuType
    icon?: string
    sort?: number
    status?: number
    facode: string
    fa_challenge_id: string
}

export type UpdatePermissionMenuParams = CreatePermissionMenuParams

export interface DeletePermissionMenuParams {
    facode: string
    fa_challenge_id: string
    cascade?: boolean
}

export interface UpdatePermissionMenuStatusParams {
    status: number
    facode: string
    fa_challenge_id: string
}

export interface MovePermissionMenuParams {
    parent_id: number
    sort?: number
    facode: string
    fa_challenge_id: string
}

const normalizeMenuItem = (item: Partial<RoleMenuItem>): RoleMenuItem => ({
    ...item,
    name: String(item.name ?? item.component ?? ''),
    component: String(item.component ?? item.name ?? ''),
    children: item.children?.map(normalizeMenuItem),
})

const normalizePermissionMenuNode = (item: Record<string, unknown>): PermissionMenuNode => ({
    id: Number(item.id ?? 0),
    parentId: Number(item.parent_id ?? item.parentId ?? 0),
    name: String(item.name ?? ''),
    title: String(item.title ?? item.name ?? ''),
    type: Number(item.type ?? 0) as PermissionMenuType,
    icon: String(item.icon ?? ''),
    sort: Number(item.sort ?? 0),
    status: Number(item.status ?? 0),
    protected: Boolean(item.protected),
    children: Array.isArray(item.children)
        ? (item.children as Array<Record<string, unknown>>).map(normalizePermissionMenuNode)
        : undefined,
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
            name: String(item.name ?? ''),
            type: typeof item.type === 'number' ? item.type : Number(item.type ?? 0),
            icon: String(item.icon ?? ''),
            sort: Number(item.sort ?? 0),
            status: Number(item.status ?? 0),
            children: Array.isArray(item.children)
                ? (item.children as Array<Record<string, unknown>>).map(normalize)
                : undefined,
        })
        return list.map(normalize)
    }

    /** 全量权限节点树（权限节点管理用） */
    async permissionMenuTree(): Promise<PermissionMenuNode[]> {
        const result = await this.api.post<
            Array<Record<string, unknown>>,
            Array<Record<string, unknown>>
        >('/admin/menus/list', {})
        return Array.isArray(result) ? result.map(normalizePermissionMenuNode) : []
    }

    /** 新增权限节点 */
    async createPermissionMenu(params: CreatePermissionMenuParams): Promise<{ id: number }> {
        return this.api.post<{ id: number }, { id: number }, CreatePermissionMenuParams>(
            '/admin/menus',
            params,
        )
    }

    /** 编辑权限节点 */
    async updatePermissionMenu(id: number, params: UpdatePermissionMenuParams): Promise<void> {
        await this.api.put<void, void, UpdatePermissionMenuParams>(
            `/admin/menus/${encodeURIComponent(id)}`,
            params,
        )
    }

    /** 删除权限节点 */
    async deletePermissionMenu(id: number, params: DeletePermissionMenuParams): Promise<void> {
        await this.api.delete<void, void, DeletePermissionMenuParams>(
            `/admin/menus/${encodeURIComponent(id)}`,
            { data: params },
        )
    }

    /** 启用或禁用权限节点 */
    async updatePermissionMenuStatus(
        id: number,
        params: UpdatePermissionMenuStatusParams,
    ): Promise<void> {
        await this.api.post<void, void, UpdatePermissionMenuStatusParams>(
            `/admin/menus/status/${encodeURIComponent(id)}`,
            params,
        )
    }

    /** 移动权限节点父级并调整排序 */
    async movePermissionMenu(id: number, params: MovePermissionMenuParams): Promise<void> {
        await this.api.post<void, void, MovePermissionMenuParams>(
            `/admin/menus/move/${encodeURIComponent(id)}`,
            params,
        )
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
