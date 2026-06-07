import { Message } from '@arco-design/web-vue'
import { encryptAESGCM } from '@/utils/aesGcm'
import md5 from 'md5'

interface CurrentUserSecurityContext {
    userId: string
    pwdIv: string
    ivId: string
}

export default function useCurrentUserSecurity() {
    const { t } = useI18n()
    const userStore = user()

    const getSecurityContext = async (): Promise<CurrentUserSecurityContext> => {
        if (!userStore.pwdIv) {
            await userStore.getPwdIv()
        }

        if (!userStore.userInfo?.userId) {
            await userStore.getUserInfo()
        }

        const userId = String(userStore.userInfo?.userId ?? '')
        const pwdIv = String(userStore.pwdIv ?? '')
        const ivId = String(userStore.pwdIvId ?? '')

        if (!userId || !pwdIv) {
            const message = t('用户信息缺失，请刷新后重试')
            Message.error(message)
            throw new Error(message)
        }

        return { userId, pwdIv, ivId }
    }

    const encryptCurrentUserPassword = async (plainText: string): Promise<{ password: string; iv_id: string }> => {
        // 每次调用都重新获取 IV，确保每个密文对应独立的一次性 IV
        await userStore.getPwdIv()

        if (!userStore.userInfo?.userId) {
            await userStore.getUserInfo()
        }

        const userId = String(userStore.userInfo?.userId ?? '')
        const pwdIv = String(userStore.pwdIv ?? '')
        const ivId = String(userStore.pwdIvId ?? '')

        if (!userId || !pwdIv) {
            const message = t('用户信息缺失，请刷新后重试')
            Message.error(message)
            throw new Error(message)
        }

        const password = await encryptAESGCM(plainText, md5(`${userId}sys-api`), pwdIv)
        return { password, iv_id: ivId }
    }

    const getCurrentUserId = async (): Promise<string> => {
        const { userId } = await getSecurityContext()
        return userId
    }

    return {
        encryptCurrentUserPassword,
        getCurrentUserId,
    }
}
