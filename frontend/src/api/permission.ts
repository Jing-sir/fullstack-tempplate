import { Api } from '@/api/api'

class PermissionApi extends Api {
    permissionList(): Promise<
        {
            id: string // 权限ID	string
            name: string // 名称
            type: string // 类型:1=页面，2=按钮	string
            path: string // 路径
            title: string // 标题
            route: string // 路由
            parentId: string // 父ID
            checked: number // 是否选中:1=是,2=否
        }[]
    > {
        // 权限列表
        return this.api.get('/sys/permission/list')
    }

    check(params: { roleId: string }): Promise<
        {
            // 编辑获取角色权限
            id: string
            name: string
            type: string
            path: string
            title: string
            route: string
            parentId: string
            checked: number
        }[]
    > {
        return this.api.get('/sys/permission/check', { params })
    }

    homeMenu(): Promise<
        {
            id: string // 权限ID
            name: string // 名称
            component: string
            type: string | number // 类型:1=页面，2=按钮
            path: string // 路径
            title: string // 标题
            route: string // 路由
            parentId: string // 父ID
        }[]
    > {
        // 首页菜单
        return this.api.get('/sys/permission/homeMenu')
    }
}
export default new PermissionApi()
