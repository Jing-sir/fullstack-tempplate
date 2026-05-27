import { Message } from '@arco-design/web-vue'
import { encryptAESGCM } from '@/utils/aesGcm'
import md5 from 'md5'

interface CurrentUserSecurityContext {
    userId: string
    pwdIv: string
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

        if (!userId || !pwdIv) {
            const message = t('用户信息缺失，请刷新后重试')
            Message.error(message)
            throw new Error(message)
        }

        return { userId, pwdIv }
    }

    const encryptCurrentUserPassword = async (plainText: string): Promise<string> => {
        const { userId, pwdIv } = await getSecurityContext()
        return encryptAESGCM(plainText, md5(`${userId}sys-api`), pwdIv)
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
