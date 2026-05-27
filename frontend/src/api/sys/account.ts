import { Api } from '@/api/api'
import type { SystemUserRow } from '@/interface/SystemManageType'

/**
 * /sys 管理员账号相关接口。
 */
class SysAccountApi extends Api {
    /** 管理员列表 */
    sysUserList(params: {
        pageNo: number
        pageSize: number
        account: string
        realName: string
    }): Promise<{
        list: SystemUserRow[]
        pageNo: number
        pageSize: number
        totalPages: number
        totalSize: number
    }> {
        return this.api.get('/sys/user/list', { params })
    }

    /** 新增/编辑管理员 */
    sysUserAddOrUpdate(params: {
        account?: string
        id?: string
        fullName?: string
        roleId?: string
        state?: number
    }): Promise<void> {
        return this.api.post('/sys/user/addOrUpdate', params)
    }

    /** 查看管理员详情 */
    sysUserInfo(params: { userId: string | undefined }): Promise<{
        account: string
        createTime: string
        fullName: string
        id: string
        newsletter: string
        remark: string
        roleId: string
        roleName: string
        state: number
        updateTime: string
    }> {
        return this.api.get('/sys/user/getUserInfo', { params })
    }

    /** 重置登录密码（管理员操作） */
    sysUserResetPassword(params: {
        password?: string
        type: 1 | 2 | 3
        userId: string
        facode: string
    }): Promise<void> {
        return this.api.post('/sys/user/resetPassword', params)
    }

    /** 重置秘钥（2FA 绑定设备重置） */
    setSysUserResetSecret(params: {
        code?: string
        password: string
        userId: string
        facode: string
    }): Promise<{ opPassword: boolean; opPasswordSetting: boolean }> {
        return this.api.post('/sys/user/resetSecret', params)
    }
}

export default new SysAccountApi()
