import { Api } from '@/api/api'

interface CheckUserCipherParams {
    password: string
    userId: string
}

interface CheckUserCipherAnd2FAParams extends CheckUserCipherParams {
    facode: string
}

interface UserQrcodeResponse {
    qrcode: string
    secret: string
}

class SysSecurityApi extends Api {
    /** 校验登录密码（绑定 2FA 前置校验） */
    checkUserCipher(params: CheckUserCipherParams): Promise<boolean> {
        return this.api.post('/sys/user/checkCipher', params)
    }

    /** 校验登录密码与原 2FA（更换 2FA 前置校验） */
    checkUserCipherAnd2FA(params: CheckUserCipherAnd2FAParams): Promise<boolean> {
        return this.api.post('/sys/user/checkCipherAnd2FA', params)
    }

    /** 获取 2FA 密钥二维码 */
    getUserQrcode(): Promise<UserQrcodeResponse> {
        return this.api.get('/sys/user/qrcode')
    }

    /** 校验新 2FA 验证码并绑定 */
    verifyGoogleCodeAndBind(params: { code: string }): Promise<boolean> {
        return this.api.get('/sys/user/checkGoogleCodeAnd', { params })
    }

    /** 校验 2FA 验证码 */
    validateGoogleCode(params: { googleCode: string }): Promise<boolean> {
        return this.api.post('/sys/validateGoogle', params)
    }
}

export default new SysSecurityApi()
