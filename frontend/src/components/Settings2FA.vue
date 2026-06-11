<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import sysAuthApi from '@/api/sys/auth'
import apiUser from '@/api/userApi/sys/security'
import VueQr from 'vue-qr'
import useCurrentUserSecurity from '@/use/useCurrentUserSecurity'
import { clearManageToken, setManageToken } from '@/utils/session'
import GoogleCode from '@/components/GoogleCode.vue'

type Settings2FAType = 'add' | 'edit' | 'loginset' | 'login'
type GoogleCodePurpose = 'replaceCurrent' | 'bindNew' | 'verifyLogin'

interface FormState {
    password: string
}

const props = withDefaults(
    defineProps<{
        visible: boolean
        type: Settings2FAType
        activeData?: Record<string, unknown>
        width?: number
    }>(),
    {
        width: 420,
        activeData: () => ({}),
    },
)

const emit = defineEmits<{
    (e: 'onClose'): void
    (e: 'onSuccess'): void
}>()

const { t } = useI18n()
const { push } = useRouter()
const storeTagsView = tagsView()
const { encryptCurrentUserPassword, getCurrentUserId } = useCurrentUserSecurity()

const formRef = ref<FormInstance | null>(null)
const googleCodeRef = ref<InstanceType<typeof GoogleCode> | null>(null)
const isGoogleCodeMounted = shallowRef(false)
const googleCodePurpose = shallowRef<GoogleCodePurpose>('bindNew')
const step = ref<1 | 2>(1)
const isSubmitLoading = ref(false)
const secretKey = ref('')
const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey.value)
    Message.success(t('复制成功'))
}
const qrCode = ref('')
const formState = reactive<FormState>({
    password: '',
})

const isAddOrEdit = computed(() => ['add', 'edit'].includes(props.type))
const googleCodeAction = computed(() =>
    googleCodePurpose.value === 'replaceCurrent' ? 'security.2fa.replace' : undefined,
)
const googleCodeTarget = computed(() =>
    googleCodePurpose.value === 'replaceCurrent' ? 'current' : undefined,
)

const titleKeyMap: Record<Settings2FAType, string> = {
    add: '绑定2FA',
    edit: '更换2FA',
    loginset: '设置2FA',
    login: '验证2FA',
}

const dialogTitle = computed(() => t(titleKeyMap[props.type]))

const addOrEditPrimaryButtonText = computed(() => t('验证'))
const verifyFlowPrimaryButtonText = computed(() => t('验证'))

/**
 * 只在当前步骤存在输入项时校验，避免未展示字段影响校验结果。
 */
const formRules = computed<Record<string, FieldRule[]>>(() => ({
    password: [{ required: true, message: t('请输入'), trigger: 'blur' }],
}))

const resetLocalState = (): void => {
    step.value = 1
    secretKey.value = ''
    qrCode.value = ''
    formState.password = ''
    formRef.value?.resetFields()
}

const onCancel = (): void => {
    if (isSubmitLoading.value) return
    googleCodeRef.value?.closeDialog()
    isGoogleCodeMounted.value = false
    emit('onClose')
}

const openGoogleCode = async (purpose: GoogleCodePurpose): Promise<void> => {
    googleCodePurpose.value = purpose
    isGoogleCodeMounted.value = true
    await nextTick()
    await googleCodeRef.value?.onShowDialog(true)
}

const closeGoogleCode = (): void => {
    googleCodeRef.value?.closeDialog()
    isGoogleCodeMounted.value = false
}

/**
 * 获取绑定/设置 2FA 所需的密钥和二维码。
 * add/edit 在密码校验通过后请求，login/loginset 在弹窗打开时预请求。
 */
const getQrCode = async (): Promise<void> => {
    if (isSubmitLoading.value) return
    isSubmitLoading.value = true

    const result = await apiUser.getUserQrcode().finally(() => {
        isSubmitLoading.value = false
    })
    secretKey.value = result.secret
    qrCode.value = result.qrcode
}

const validateCurrentStep = async (): Promise<boolean> => {
    if (step.value === 2) return true
    const errors = await formRef.value?.validate()
    return !errors
}

/**
 * 绑定/更换 2FA 完成后，按当前项目登录态策略强制重新登录。
 */
const handleLogoutAfterSecurityChange = async (): Promise<void> => {
    await sysAuthApi.loginOut().catch(() => undefined)
    clearManageToken()
    storeTagsView.clearVisitedView()
    await push('/login')
}

const handleAddOrEditSubmit = async (): Promise<void> => {
    if (step.value === 1) {
        if (props.type === 'edit') {
            await openGoogleCode('replaceCurrent')
            return
        }

        isSubmitLoading.value = true
        try {
            const userId = await getCurrentUserId()
            const { password, iv_id } = await encryptCurrentUserPassword(formState.password)
            await apiUser.checkUserCipher({ password, userId, iv_id })
            const qrcodeResult = await apiUser.getUserQrcode()
            secretKey.value = qrcodeResult.secret
            qrCode.value = qrcodeResult.qrcode

            step.value = 2
        } finally {
            isSubmitLoading.value = false
        }
        return
    }

    await openGoogleCode('bindNew')
}

const handleVerifySubmit = async (): Promise<void> => {
    await openGoogleCode(props.type === 'login' ? 'verifyLogin' : 'bindNew')
}

const handleGoogleCode = async (code: string, faChallengeID: string): Promise<void> => {
    isSubmitLoading.value = true
    try {
        if (googleCodePurpose.value === 'replaceCurrent') {
            const userId = await getCurrentUserId()
            const { password, iv_id } = await encryptCurrentUserPassword(formState.password)
            const qrcodeResult = await apiUser.replaceUserQrcode({
                password,
                facode: code,
                fa_challenge_id: faChallengeID,
                userId,
                iv_id,
            })
            secretKey.value = qrcodeResult.secret
            qrCode.value = qrcodeResult.qrcode
            step.value = 2
            closeGoogleCode()
            return
        }

        if (isAddOrEdit.value) {
            await apiUser.verifyGoogleCodeAndBind({ code })
            closeGoogleCode()
            emit('onClose')
            Message.success(t(props.type === 'add' ? '2FA绑定成功' : '2FA更换成功'))
            await handleLogoutAfterSecurityChange()
            return
        }

        const loginResult = await apiUser.validateGoogleCode({ googleCode: code })
        if (loginResult.token) {
            setManageToken(loginResult.token)
        }
        closeGoogleCode()
        emit('onSuccess')
        Message.success(t('验证成功'))
    } finally {
        isSubmitLoading.value = false
    }
}

const handleSubmit = async (): Promise<void> => {
    if (isSubmitLoading.value) return

    const isValid = await validateCurrentStep()
    if (!isValid) return

    if (isAddOrEdit.value) {
        await handleAddOrEditSubmit()
        return
    }

    await handleVerifySubmit()
}

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            closeGoogleCode()
            resetLocalState()
            return
        }

        resetLocalState()
        if (props.type === 'login') {
            void openGoogleCode('verifyLogin')
            return
        }

        if (props.type === 'loginset') {
            step.value = 1
            void getQrCode()
        }
    },
)
</script>

<template>
    <a-modal
        :visible="props.visible"
        :title="dialogTitle"
        :mask-closable="false"
        :cancel-button-props="{ disabled: isSubmitLoading }"
        :width="props.width"
        :footer="false"
        @cancel="onCancel"
    >
        <template v-if="isAddOrEdit">
            <template v-if="step === 1">
                <a-form ref="formRef" layout="vertical" :model="formState" :rules="formRules">
                    <a-form-item :label="t('登录密码')" field="password">
                        <a-input-password v-model="formState.password" :placeholder="t('请输入')" />
                    </a-form-item>
                </a-form>
            </template>

            <template v-if="step === 2">
                <div class="space-y-4">
                    <div>
                        <p class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                            {{ t('在谷歌验证器输入密钥') }}
                        </p>
                        <a-input :model-value="secretKey" disabled>
                            <template #suffix>
                                <icon-copy
                                    class="cursor-pointer text-[var(--app-text-3)] hover:text-[var(--app-primary)]"
                                    @click="copySecretKey"
                                />
                            </template>
                        </a-input>
                    </div>
                    <div>
                        <p class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                            {{ t('或者在谷歌验证器扫描密钥二维码') }}
                        </p>
                        <div class="flex justify-center">
                            <VueQr :text="qrCode" logo-src="" :size="160" />
                        </div>
                    </div>
                </div>
            </template>

        </template>

        <template v-else>
            <div class="space-y-4">
                <div>
                    <p class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                        {{ t('在谷歌验证器输入密钥') }}
                    </p>
                    <a-input :model-value="secretKey" disabled>
                        <template #suffix>
                            <icon-copy
                                class="cursor-pointer text-[var(--app-text-3)] hover:text-[var(--app-primary)]"
                                @click="copySecretKey"
                            />
                        </template>
                    </a-input>
                </div>
                <div>
                    <p class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                        {{ t('或者在谷歌验证器扫描密钥二维码') }}
                    </p>
                    <div class="flex justify-center">
                        <VueQr :text="qrCode" logo-src="" :size="160" />
                    </div>
                </div>
            </div>
        </template>

        <div class="mt-4 flex w-full gap-3">
            <template v-if="isAddOrEdit">
                <a-button
                    v-if="step === 2"
                    class="flex-1"
                    :loading="isSubmitLoading"
                    @click="getQrCode"
                >
                    {{ t('重新获取') }}
                </a-button>
                <a-button
                    type="primary"
                    class="flex-1"
                    :loading="isSubmitLoading"
                    @click="handleSubmit"
                >
                    {{ addOrEditPrimaryButtonText }}
                </a-button>
            </template>

            <template v-else>
                <a-button
                    type="primary"
                    class="flex-1"
                    :loading="isSubmitLoading"
                    @click="handleSubmit"
                >
                    {{ verifyFlowPrimaryButtonText }}
                </a-button>
            </template>
        </div>
    </a-modal>

    <GoogleCode
        v-if="isGoogleCodeMounted"
        ref="googleCodeRef"
        :loading="isSubmitLoading"
        :action="googleCodeAction"
        :target="googleCodeTarget"
        @set-code="handleGoogleCode"
        @cancel="isGoogleCodeMounted = false"
    />
</template>
