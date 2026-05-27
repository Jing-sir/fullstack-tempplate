import { Api } from '@/api/api'
import type {
    RolePermissionsType,
    SystemRoleItem,
    TreeDataType,
} from '@/interface/SystemManageType'

/**
 * /sys 角色与菜单权限相关接口。
 */
class SysRoleApi extends Api {
    /** 获取当前用户的菜单树（用于侧边栏渲染） */
    menuList(): Promise<{
        id: string
        name: string
        component: string
        type: string | number
        path: string
        title: string
        route: string
        parentId: string
    }[]> {
        return this.api.get('/sys/menu/list')
    }

    /** 角色列表 */
    sysRoleList(): Promise<SystemRoleItem[]> {
        return this.api.get('/sys/role/list')
    }

    /** 新增/编辑角色及权限 */
    sysRoleAddUpdate(params: {
        checkOpPassword: boolean
        menuIdList: {
            checkUserPassword: number
            menuId: number
        }[]
        roleId?: string
        remark?: string
        state?: 1 | 2
        roleName: string
    }): Promise<void> {
        return this.api.post('/sys/role/addOrUpdate', params)
    }

    /** 获取角色信息 */
    sysRoleInfo(params: { roleId: string }): Promise<RolePermissionsType> {
        return this.api.get('/sys/role/getInfo', { params })
    }

    /** 获取完整权限菜单树 */
    sysRoleMenuList(): Promise<TreeDataType[]> {
        return this.api.get('/sys/menu/permissions/list')
    }

    /** 编辑角色时获取已勾选的权限菜单列表 */
    sysInfoCheckMenuList(params: { roleId: string }): Promise<TreeDataType[]> {
        return this.api.get('/sys/menu/permissions/check/list', { params })
    }
}

export default new SysRoleApi()
