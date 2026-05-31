<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import Settings2FA from '@/components/Settings2FA.vue'
import GoogleCode from '@/components/GoogleCode.vue'
import { Message } from '@arco-design/web-vue'
import logoUrl from '@/assets/images/logo.png'
import { useRequest } from 'vue-request'
import sysAuthApi from '@/api/sys/auth'
import { setManageToken } from '@/utils/session'

const { t } = useI18n()

interface LoginFormState {
    account: string
    password: string
}

const codeRef = ref<InstanceType<typeof GoogleCode> | null>(null)
const formRef = ref<FormInstance | null>(null)
const is2FAModalOpen = ref(false)

const formState = reactive<LoginFormState>({
    account: '',
    password: '',
} satisfies LoginFormState)

const userStore = user()
const router = useRouter()
const route = useRoute()

const rules = {
    account: [{ required: true, message: t('请输入账号'), trigger: 'blur' }],
    password: [{ required: true, message: t('请输入密码'), trigger: 'blur' }],
}

const { loading, runAsync } = useRequest(
    async (twoFACode = '') => {
        const { account, password } = formState
        return sysAuthApi.sysUserLogin({ account, password, twoFACode })
    },
    {
        manual: true,
    },
)

const resolveLoginRedirect = (): string => {
    const { redirect } = route.query
    if (typeof redirect !== 'string') return '/'
    return redirect.startsWith('/') ? redirect : '/'
}

const finishLogin = async (): Promise<void> => {
    Message.success(t('登录成功'))
    await router.push(resolveLoginRedirect())
}

/**
 * 登录返回 googleState === 2 时进入“设置/绑定 2FA”流程。
 * 关闭弹窗代表中断登录，需回收当前临时 token，避免残留登录态。
 */
const onClose2FAModal = (): void => {
    is2FAModalOpen.value = false
    setManageToken('')
}

/**
 * 2FA 设置流程成功后，继续沿用现有登录成功跳转逻辑（支持 redirect 回跳）。
 */
const onSuccess2FA = async (): Promise<void> => {
    is2FAModalOpen.value = false
    await finishLogin()
}

const handleLoginResult = async (
    loginData: PromiseReturnType<typeof sysAuthApi.sysUserLogin>,
): Promise<void> => {
    if (loginData.token) {
        setManageToken(loginData.token)
    }
    if (loginData.user) {
        userStore.setUserInfo(loginData.user)
    }

    if (loginData.googleState === 2) {
        is2FAModalOpen.value = true
        return
    }

    if (loginData.googleState === 1) {
        await codeRef.value?.onShowDialog(true)
        return
    }

    await finishLogin()
}

const onOk = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors) return

    const loginData = await runAsync()
    await handleLoginResult(loginData)
}

const getCode = async (val: string): Promise<void> => {
    const loginData = await runAsync(val)
    codeRef.value?.closeDialog()
    await handleLoginResult(loginData)
}

const onCancelGoogleCode = (): void => {
    setManageToken('')
}
</script>

<template>
    <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
        <div class="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
            <a-spin :loading="loading" class="w-[420px]">
                <div
                    class="overflow-hidden rounded-xl border border-[var(--app-divider)] bg-[var(--app-login-card-bg)] shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
                >
                    <section class="px-6 py-8 text-[var(--app-text)]">
                        <Settings2FA
                            :visible="is2FAModalOpen"
                            type="loginset"
                            :active-data="{}"
                            @onClose="onClose2FAModal"
                            @onSuccess="onSuccess2FA"
                        />

                        <GoogleCode
                            ref="codeRef"
                            :loading="loading"
                            @setCode="getCode"
                            @cancel="onCancelGoogleCode"
                        />

                        <div>
                            <h2
                                class="text-3xl font-semibold leading-tight text-[var(--app-text)] sm:text-4xl"
                            >
                                {{ t('欢迎回来') }}
                            </h2>
                            <p class="mt-3 max-w-md text-sm leading-6 text-[var(--app-text-muted)]">
                                {{ t('请使用您的管理账号进行登录') }}
                            </p>
                        </div>

                        <div class="mt-8">
                            <div class="mb-6 flex items-center justify-between gap-4">
                                <div>
                                    <p class="text-lg font-semibold text-[var(--app-text)]">
                                        {{ t('账号登录') }}
                                    </p>
                                </div>
                                <div
                                    class="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--app-divider)] bg-[var(--app-control-bg)]"
                                >
                                    <img
                                        :src="logoUrl"
                                        :alt="t('管理后台')"
                                        class="h-7 w-7 object-contain"
                                    />
                                </div>
                            </div>

                            <a-form
                                ref="formRef"
                                class="login-form"
                                layout="vertical"
                                :rules="rules"
                                :model="formState"
                            >
                                <a-form-item :label="t('账号')" field="account">
                                    <a-input
                                        v-model="formState.account"
                                        size="large"
                                        allow-clear
                                        :placeholder="t('请输入账号')"
                                    />
                                </a-form-item>
                                <a-form-item :label="t('密码')" field="password">
                                    <a-input-password
                                        v-model="formState.password"
                                        size="large"
                                        :placeholder="t('请输入密码')"
                                        @keyup.enter="onOk"
                                    />
                                </a-form-item>
                                <a-button
                                    long
                                    size="large"
                                    type="primary"
                                    class="mt-2 h-12 rounded-2xl border-0 text-base font-semibold"
                                    :loading="loading"
                                    @click.stop="onOk"
                                >
                                    {{ t('登录') }}
                                </a-button>
                            </a-form>
                        </div>
                    </section>
                </div>
            </a-spin>
        </div>
    </div>
</template>
