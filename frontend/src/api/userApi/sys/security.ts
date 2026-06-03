import { Api } from '../../api'
import sysAuthApi, { type SysUserLoginResult } from '@/api/sys/auth'

interface QrCodeResponse {
    otp_auth_url?: string
    qrcode?: string
    secret: string
}

interface QrCodeResult {
    qrcode: string
    secret: string
}

interface PasswordCheckParams {
    password: string
    userId: string
    facode?: string
}

class UserSecurityApi extends Api {
    async getUserQrcode(): Promise<QrCodeResult> {
        const result = await this.api.get<QrCodeResponse, QrCodeResponse>('/user/2fa/setup')
        return {
            secret: result.secret,
            qrcode: String(result.qrcode ?? result.otp_auth_url ?? ''),
        }
    }

    async checkUserCipher(params: PasswordCheckParams): Promise<void> {
        await this.api.post<void, void, PasswordCheckParams>('/user/password/check', params)
    }

    async checkUserCipherAnd2FA(params: PasswordCheckParams): Promise<void> {
        await this.api.post<void, void, PasswordCheckParams>('/user/password/2fa/check', params)
    }

    async verifyGoogleCodeAndBind(params: { code: string }): Promise<SysUserLoginResult> {
        return sysAuthApi.validateGoogle(params)
    }

    async validateGoogleCode(params: { googleCode: string }): Promise<SysUserLoginResult> {
        return this.verifyGoogleCodeAndBind({ code: params.googleCode })
    }
}

export default new UserSecurityApi()
