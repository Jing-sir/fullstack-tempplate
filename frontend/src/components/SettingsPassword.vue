<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import sysAuthApi from '@/api/sys/auth'
import useCurrentUserSecurity from '@/use/useCurrentUserSecurity'
import { clearManageToken } from '@/utils/session'
import GoogleCode from '@/components/GoogleCode.vue'

interface PasswordFormState {
    oldPassword: string
    newPassword: string
    confirmPassword: string
}

const props = withDefaults(
    defineProps<{
        visible: boolean
        width?: number
    }>(),
    {
        width: 420,
    },
)

const emit = defineEmits<{
    (e: 'onClose'): void
    (e: 'onSuccess'): void
}>()

const { t } = useI18n()
const router = useRouter()
const storeTagsView = tagsView()
const { encryptCurrentUserPassword } = useCurrentUserSecurity()

const formRef = ref<FormInstance | null>(null)
const googleCodeRef = ref<InstanceType<typeof GoogleCode> | null>(null)
const isGoogleCodeMounted = shallowRef(false)
const isSubmitLoading = ref(false)
const formState = reactive<PasswordFormState>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
})

const formRules = computed<Record<string, FieldRule[]>>(() => ({
    oldPassword: [{ required: true, message: t('请输入旧密码'), trigger: 'blur' }],
    newPassword: [
        { required: true, message: t('请输入新密码'), trigger: 'blur' },
        {
            validator: async (_rule: FieldRule, value: string) => {
                if (!value) return Promise.resolve()
                if (PASSWORD.test(value)) return Promise.resolve()
                return Promise.reject(t('请输入6-30位且同时包含数字、大小写字母的密码'))
            },
            trigger: 'blur',
        },
    ],
    confirmPassword: [
        { required: true, message: t('请输入验证新密码'), trigger: 'blur' },
        {
            validator: async (_rule: FieldRule, value: string) => {
                if (!value) return Promise.resolve()
                if (value === formState.newPassword) return Promise.resolve()
                return Promise.reject(t('两次密码输入不一致，请重新输入'))
            },
            trigger: 'blur',
        },
    ],
}))

const resetLocalState = (): void => {
    formState.oldPassword = ''
    formState.newPassword = ''
    formState.confirmPassword = ''
    formRef.value?.resetFields()
}

const onCancel = (): void => {
    if (isSubmitLoading.value) return
    googleCodeRef.value?.closeDialog()
    isGoogleCodeMounted.value = false
    emit('onClose')
}

/**
 * 老项目行为：改密成功后立即使当前登录态失效并回到登录页，避免旧会话继续操作。
 */
const logoutAfterPasswordChanged = async (): Promise<void> => {
    await sysAuthApi.loginOut().catch(() => undefined)
    clearManageToken()
    storeTagsView.clearVisitedView()
    await router.push('/login')
}

const handleSubmit = async (): Promise<void> => {
    if (isSubmitLoading.value) return

    const errors = await formRef.value?.validate()
    if (errors) return

    isGoogleCodeMounted.value = true
    await nextTick()
    await googleCodeRef.value?.onShowDialog(true)
}

const handleTwoFAConfirm = async (facode: string, faChallengeID: string): Promise<void> => {
    if (isSubmitLoading.value) return

    isSubmitLoading.value = true
    try {
        const { password: encryptedOldPassword, iv_id } = await encryptCurrentUserPassword(formState.oldPassword)
        const { password: encryptedNewPassword, iv_id: new_iv_id } = await encryptCurrentUserPassword(formState.newPassword)

        await sysAuthApi.sysUserUpdatePassword({
            oldPassword: encryptedOldPassword,
            password: encryptedNewPassword,
            type: 1,
            facode,
            fa_challenge_id: faChallengeID,
            iv_id,
            new_iv_id,
        })

        googleCodeRef.value?.closeDialog()
        isGoogleCodeMounted.value = false
        emit('onSuccess')
        emit('onClose')
        Message.success(t('密码修改成功'))
        await logoutAfterPasswordChanged()
    } catch {
        // 请求层和安全上下文工具已经负责错误提示，这里只恢复提交态。
    } finally {
        isSubmitLoading.value = false
    }
}

watch(
    () => props.visible,
    (visible) => {
        if (visible) return
        googleCodeRef.value?.closeDialog()
        isGoogleCodeMounted.value = false
        resetLocalState()
    },
)
</script>

<template>
    <a-modal
        :visible="props.visible"
        :title="t('修改密码')"
        :mask-closable="false"
        :cancel-button-props="{ disabled: isSubmitLoading }"
        :confirm-loading="isSubmitLoading"
        :width="props.width"
        @cancel="onCancel"
        @ok="handleSubmit"
    >
        <a-form ref="formRef" layout="vertical" :model="formState" :rules="formRules">
            <a-form-item :label="t('旧密码')" field="oldPassword">
                <a-input-password
                    v-model="formState.oldPassword"
                    :placeholder="t('请输入旧密码')"
                />
            </a-form-item>
            <a-form-item :label="t('新密码')" field="newPassword">
                <a-input-password
                    v-model="formState.newPassword"
                    :placeholder="t('请输入新密码')"
                />
            </a-form-item>
            <a-form-item :label="t('验证新密码')" field="confirmPassword">
                <a-input-password
                    v-model="formState.confirmPassword"
                    :placeholder="t('请输入验证新密码')"
                />
            </a-form-item>
        </a-form>
    </a-modal>

    <GoogleCode
        v-if="isGoogleCodeMounted"
        ref="googleCodeRef"
        :loading="isSubmitLoading"
        action="security.password.update"
        target="current"
        @set-code="handleTwoFAConfirm"
        @cancel="isGoogleCodeMounted = false"
    />
</template>
