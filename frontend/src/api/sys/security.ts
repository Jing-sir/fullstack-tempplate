import { Api } from '@/api/api'

/**
 * /sys 安全校验相关接口。
 */
class SysSecurityApi extends Api {
    /** 校验操作密码（绑定 2FA 前的验证） */
    checkCipher(params: {
        password: string
        userId: string
        facode?: string
        type?: 1 | 2 | 3
    }): Promise<boolean> {
        return this.api.post('/sys/user/checkCipher', params)
    }
}

export default new SysSecurityApi()
