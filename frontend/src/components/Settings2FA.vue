<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import sysAuthApi from '@/api/sys/auth'
import apiUser from '@/api/userApi/sys/security'
import { handlePaste } from '@/utils/common'
import VueQr from 'vue-qr'
import useCurrentUserSecurity from '@/use/useCurrentUserSecurity'
import { clearManageToken, setManageToken } from '@/utils/session'

type Settings2FAType = 'add' | 'edit' | 'loginset' | 'login'

interface FormState {
    password: string
    code: string
    facode: string
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
const step = ref<1 | 2 | 3>(1)
const isSubmitLoading = ref(false)
const secretKey = ref('')
const qrCode = ref('')
const formState = reactive<FormState>({
    password: '',
    code: '',
    facode: '',
})

const isAddOrEdit = computed(() => ['add', 'edit'].includes(props.type))
const isEditType = computed(() => props.type === 'edit')
const showBackButton = computed(() => step.value === 3 && props.type !== 'login')

const titleKeyMap: Record<Settings2FAType, string> = {
    add: '绑定2FA',
    edit: '更换2FA',
    loginset: '设置2FA',
    login: '验证2FA',
}

const dialogTitle = computed(() => t(titleKeyMap[props.type]))

const addOrEditPrimaryButtonText = computed(() => {
    if (step.value === 1) return t('验证')
    if (step.value === 2) return t('下一步')
    return t('确认')
})

const verifyFlowPrimaryButtonText = computed(() => (step.value === 1 ? t('下一步') : t('验证')))

/**
 * 只在当前步骤存在输入项时校验，避免未展示字段影响校验结果。
 */
const formRules = computed<Record<string, FieldRule[]>>(() => ({
    password: [{ required: true, message: t('请输入'), trigger: 'blur' }],
    facode: [
        {
            validator: async (_rule: FieldRule, value: string) => {
                if (!isEditType.value && !value) return Promise.resolve()
                if (/^\d{6}$/.test(String(value ?? ''))) return Promise.resolve()
                return Promise.reject(t('请输入6位数字验证码'))
            },
            trigger: 'blur',
        },
    ],
    code: [
        { required: true, message: t('请输入6位数字验证码'), trigger: 'blur' },
        { match: /^\d{6}$/, message: t('请输入6位数字验证码'), trigger: 'blur' },
    ],
}))

const resetLocalState = (): void => {
    step.value = 1
    secretKey.value = ''
    qrCode.value = ''
    formState.password = ''
    formState.code = ''
    formState.facode = ''
    formRef.value?.resetFields()
}

const onCancel = (): void => {
    if (isSubmitLoading.value) return
    emit('onClose')
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

const onPasteCode = async (): Promise<void> => {
    formState.code = (await handlePaste()).join('')
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
        isSubmitLoading.value = true
        try {
            const userId = await getCurrentUserId()
            const password = await encryptCurrentUserPassword(formState.password)
            if (props.type === 'add') {
                await apiUser.checkUserCipher({ password, userId })
            } else {
                await apiUser.checkUserCipherAnd2FA({
                    password,
                    facode: formState.facode,
                    userId,
                })
            }

            const qrcodeResult = await apiUser.getUserQrcode()
            secretKey.value = qrcodeResult.secret
            qrCode.value = qrcodeResult.qrcode
            step.value = 2
        } finally {
            isSubmitLoading.value = false
        }
        return
    }

    if (step.value === 2) {
        step.value = 3
        return
    }

    isSubmitLoading.value = true
    try {
        await apiUser.verifyGoogleCodeAndBind({ code: formState.code })
        emit('onClose')
        Message.success(t(props.type === 'add' ? '2FA绑定成功' : '2FA更换成功'))
        await handleLogoutAfterSecurityChange()
    } finally {
        isSubmitLoading.value = false
    }
}

const handleVerifySubmit = async (): Promise<void> => {
    if (step.value === 1) {
        step.value = 3
        return
    }

    isSubmitLoading.value = true
    const loginResult = await apiUser
        .validateGoogleCode({ googleCode: formState.code })
        .finally(() => {
            isSubmitLoading.value = false
        })
    if (loginResult.token) {
        setManageToken(loginResult.token)
    }
    emit('onSuccess')
    Message.success(t('验证成功'))
}

const handlePreviousStep = (): void => {
    if (step.value !== 3) return
    step.value = isAddOrEdit.value ? 2 : 1
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
            resetLocalState()
            return
        }

        resetLocalState()
        if (props.type === 'login') {
            step.value = 3
            void getQrCode()
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
                    <a-form-item v-if="isEditType" :label="t('2FA验证')" field="facode">
                        <a-input-password
                            v-model="formState.facode"
                            :placeholder="t('请输入6位数字验证码')"
                            maxlength="6"
                        />
                    </a-form-item>
                </a-form>
            </template>

            <template v-if="step === 2">
                <div class="space-y-4">
                    <div>
                        <p class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                            {{ t('在谷歌验证器输入密钥') }}
                        </p>
                        <a-input :model-value="secretKey" disabled />
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

            <template v-if="step === 3">
                <a-form ref="formRef" layout="vertical" :model="formState" :rules="formRules">
                    <a-form-item :label="t('输入谷歌验证器中生成的六位数字验证码')" field="code">
                        <div class="flex items-center gap-2">
                            <a-input
                                v-model="formState.code"
                                :placeholder="t('请输入6位数字验证码')"
                                maxlength="6"
                            />
                            <a-button type="text" @click.stop="onPasteCode">
                                {{ t('粘贴') }}
                            </a-button>
                        </div>
                    </a-form-item>
                </a-form>
            </template>
        </template>

        <template v-else>
            <template v-if="step === 3">
                <a-form ref="formRef" layout="vertical" :model="formState" :rules="formRules">
                    <a-form-item :label="t('输入谷歌验证器中生成的六位数字验证码')" field="code">
                        <div class="flex items-center gap-2">
                            <a-input
                                v-model="formState.code"
                                :placeholder="t('请输入6位数字验证码')"
                                maxlength="6"
                            />
                            <a-button type="text" @click.stop="onPasteCode">
                                {{ t('粘贴') }}
                            </a-button>
                        </div>
                    </a-form-item>
                </a-form>
            </template>
            <template v-else>
                <div class="space-y-4">
                    <div>
                        <p class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                            {{ t('在谷歌验证器输入密钥') }}
                        </p>
                        <a-input :model-value="secretKey" disabled />
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
                <a-button v-if="step === 3" class="flex-1" @click="handlePreviousStep">
                    {{ t('上一步') }}
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
                <a-button v-if="showBackButton" class="flex-1" @click="handlePreviousStep">
                    {{ t('上一步') }}
                </a-button>
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
</template>
