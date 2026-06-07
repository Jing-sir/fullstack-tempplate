import { Api } from '../api'
import { encryptAESGCM } from '@/utils/aesGcm'

export interface BackendUser {
    id?: number
    uid?: string
    username?: string
    real_name?: string
    email?: string
    phone?: string
    two_fa_enabled?: boolean
    status?: number
    avatar?: string
    created_at?: string
    updated_at?: string
}

export interface AuthUserInfo {
    account: string
    bindAccount: string
    fullName: string
    isFACode: number
    roleId: string
    roleName: string
    state: number
    userId: string
    avatar?: string
    email?: string
    phone?: string
}

// MeResult 对应后端 GET /user/info 的响应结构
export interface MeResult extends BackendUser {
    uid: string
    username: string
    status: number
}

export interface SysUserLoginParams {
    account?: string
    username?: string
    password: string
    facode?: string
    twoFACode?: string
    ivId?: string
}

export interface SysUserLoginResult {
    token: string
    googleState: 0 | 1 | 2
    twoFaRequired: boolean
    twoFaSetupRequired: boolean
    user?: AuthUserInfo
}

interface LoginRequest {
    username: string
    password: string
    two_fa_code?: string
    iv_id?: string
}

interface LoginResponse {
    token?: string
    twoFaRequired?: boolean
    twoFaSetupRequired?: boolean
    user?: BackendUser
}

interface IVChallenge {
    iv_id: string
    iv: string
}

interface UpdatePasswordParams {
    oldPassword: string
    password: string
    type: number
    facode: string
    iv_id?: string
    new_iv_id?: string
}

const emptyUserInfo = (): AuthUserInfo => ({
    account: '',
    bindAccount: '',
    fullName: '',
    isFACode: 0,
    roleId: '',
    roleName: '',
    state: 0,
    userId: '',
})

export const normalizeAuthUser = (user?: BackendUser): AuthUserInfo => {
    if (!user) return emptyUserInfo()

    const username = String(user.username ?? '')
    const realName = String(user.real_name ?? username)
    return {
        account: username,
        bindAccount: '',
        fullName: realName,
        isFACode: user.two_fa_enabled ? 1 : 0,
        roleId: '',
        roleName: '',
        state: Number(user.status ?? 0),
        userId: String(user.uid ?? user.id ?? ''),
        avatar: user.avatar,
        email: user.email,
        phone: user.phone,
    }
}

const normalizeLoginResult = (result: LoginResponse): SysUserLoginResult => {
    const twoFaRequired = Boolean(result.twoFaRequired)
    const twoFaSetupRequired = Boolean(result.twoFaSetupRequired)

    return {
        token: String(result.token ?? ''),
        googleState: twoFaSetupRequired ? 2 : twoFaRequired ? 1 : 0,
        twoFaRequired,
        twoFaSetupRequired,
        user: result.user ? normalizeAuthUser(result.user) : undefined,
    }
}

class SysAuthApi extends Api {
    async sysUserLogin(params: SysUserLoginParams): Promise<SysUserLoginResult> {
        const username = String(params.username ?? params.account ?? '').trim()
        const twoFACode = String(params.twoFACode ?? params.facode ?? '').trim()

        // 获取 IV 挑战值，用 AES-GCM 加密密码后传输
        const cryptoKey = import.meta.env.VITE_APP_PASSWORD_CRYPTO_KEY as string
        const { iv_id, iv } = await this.getIVChallenge()
        const encryptedPassword = await encryptAESGCM(params.password, cryptoKey, iv)

        const payload: LoginRequest = {
            username,
            password: encryptedPassword,
            iv_id,
        }

        if (twoFACode) payload.two_fa_code = twoFACode

        const result = await this.api.post<LoginResponse, LoginResponse, LoginRequest>(
            '/login',
            payload,
        )

        return normalizeLoginResult(result)
    }

    async validateGoogle(params: {
        googleCode?: string
        code?: string
    }): Promise<SysUserLoginResult> {
        const code = String(params.googleCode ?? params.code ?? '').trim()
        const result = await this.api.post<LoginResponse, LoginResponse, { code: string }>(
            '/user/2fa/verify',
            { code },
        )

        return normalizeLoginResult(result)
    }

    async getIVChallenge(): Promise<IVChallenge> {
        return this.api.get<IVChallenge, IVChallenge>('/security/iv')
    }

    async pwdIv(): Promise<string> {
        const challenge = await this.getIVChallenge()
        return challenge.iv
    }

    // getMe 调用 /user/info 接口，返回当前用户信息
    async getMe(): Promise<MeResult> {
        return this.api.get<MeResult, MeResult>('/user/info')
    }

    // loginInfo 供 user store 兼容调用，内部转发到 getMe
    async loginInfo(): Promise<AuthUserInfo> {
        const me = await this.getMe()
        return normalizeAuthUser(me)
    }

    async loginOut(): Promise<void> {
        return Promise.resolve()
    }

    async sysUserUpdatePassword(params: UpdatePasswordParams): Promise<void> {
        await this.api.post<void, void, UpdatePasswordParams>('/user/password', params)
    }
}

export default new SysAuthApi()
