import { Api } from '@/api/api'

/**
 * /sys 认证与当前会话相关接口。
 */
class SysAuthApi extends Api {
    /** 登录 */
    sysUserLogin(params: { account: string; password: string; facode: string }): Promise<{
        initLogin: boolean
        opPassword: boolean
        opPasswordSetting: boolean
        passwordError: boolean
        passwordErrorNum: number
        token: string
        googleState: number
    }> {
        return this.api.post('/sys/login', params)
    }

    /** 退出登录 */
    loginOut(): Promise<boolean> {
        return this.api.get('/sys/user/loginOut')
    }

    /** 获取当前登录用户信息 */
    loginInfo(): Promise<{
        account: string
        bindAccount: string
        fullName: string
        isFACode: 0 | 1
        roleId: string
        roleName: string
        state: 1 | 2
        userId: string
    }> {
        return this.api.get('/sys/user/getInfo')
    }

    /** 密钥（密码加密 IV） */
    pwdIv(): Promise<string> {
        return this.api.get('/sysConfig/pwdIv')
    }

    /** 修改登录密码 */
    sysUserUpdatePassword(params: {
        password?: string
        type: 1 | 2 | 3
        oldPassword: string
        facode: string
    }): Promise<void> {
        return this.api.post('/sys/user/updatePassword', params)
    }

    /** 校验 Google 验证码 */
    validateGoogle(params: { googleCode: string }): Promise<boolean> {
        return this.api.post('/sys/validateGoogle', params)
    }
}

export default new SysAuthApi()
