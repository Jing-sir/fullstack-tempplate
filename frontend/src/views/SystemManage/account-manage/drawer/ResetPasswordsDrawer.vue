<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import sysAccountApi from '@/api/sys/account'
import useCurrentUserSecurity from '@/use/useCurrentUserSecurity'
import GoogleCode from '@/components/GoogleCode.vue'

const { t } = useI18n()
const userStore = user()
const { encryptCurrentUserPassword } = useCurrentUserSecurity()

const props = withDefaults(
    defineProps<{
        visible: boolean
        type: 'loginPwd' | '2FA'
        userId: string
        width?: number
    }>(),
    {
    },
)

const emit = defineEmits<{
    'update:visible': [value: boolean]
    onSuccess: []
}>()

const formRef = ref<FormInstance>()
const googleCodeRef = ref<InstanceType<typeof GoogleCode> | null>(null)
const isGoogleCodeMounted = shallowRef(false)
const isSubmitLoading = ref(false)
const formState = reactive({
    password: '',
})

const title = computed(() => (props.type === 'loginPwd' ? t('重置登录密码') : t('重置2FA')))
const twoFAAction = computed(() =>
    props.type === 'loginPwd' ? 'admin.password.reset' : 'admin.2fa.reset',
)
const twoFATarget = computed(() => `user:${props.userId}`)

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
})

const formRules = computed<Record<string, FieldRule[]>>(() => {
    const rules: Record<string, FieldRule[]> = {}
    if (props.type === 'loginPwd') {
        rules.password = [{ required: true, message: t('请输入'), trigger: 'blur' }]
    }
    return rules
})

const resetForm = (): void => {
    formState.password = ''
    formRef.value?.resetFields()
}

const handCancel = (): void => {
    googleCodeRef.value?.closeDialog()
    isGoogleCodeMounted.value = false
    userStore.getUserInfo()
    resetForm()
    visibleProxy.value = false
}

/**
 * 重置密码/重置 2FA 都复用这一个提交入口：
 * - 通过 props.type 显式分支具体接口，避免动态下标调用带来的类型丢失
 * - 提交 loading 统一在 finally 里收口，确保异常分支也能恢复按钮状态
 */
const handleAddOrUpdate = async (facode: string, faChallengeID: string): Promise<void> => {
    if (isSubmitLoading.value) return

    isSubmitLoading.value = true

    try {
        if (props.type === 'loginPwd') {
            const { password, iv_id } = await encryptCurrentUserPassword(formState.password)
            await sysAccountApi.sysUserResetPassword({
                facode,
                fa_challenge_id: faChallengeID,
                iv_id,
                password,
                userId: props.userId,
                type: 1,
            })
        } else {
            await sysAccountApi.setSysUserResetSecret({
                facode,
                fa_challenge_id: faChallengeID,
                userId: props.userId,
            })
        }

        Message.success(t('操作成功'))
        googleCodeRef.value?.closeDialog()
        isGoogleCodeMounted.value = false
        handCancel()
        emit('onSuccess')
    } finally {
        isSubmitLoading.value = false
    }
}

const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors) return

    isGoogleCodeMounted.value = true
    await nextTick()
    await googleCodeRef.value?.onShowDialog(true)
}
</script>

<template>
    <a-drawer
        v-model:visible="visibleProxy"
        :title="title"
        :width="props.width ?? 480"
        :ok-loading="isSubmitLoading"
        :mask-closable="false"
        @cancel="handCancel"
        @ok="handleSubmit"
    >
        <a-form
            ref="formRef"
            :model="formState"
            :rules="formRules"
            :label-col-props="{ span: 5 }"
            layout="horizontal"
        >
            <a-form-item v-if="props.type === 'loginPwd'" :label="t('登录密码')" field="password">
                <a-input-password
                    v-model="formState.password"
                    size="small"
                    :placeholder="t('请输入')"
                />
            </a-form-item>
        </a-form>
    </a-drawer>

    <GoogleCode
        v-if="isGoogleCodeMounted"
        ref="googleCodeRef"
        :loading="isSubmitLoading"
        :action="twoFAAction"
        :target="twoFATarget"
        @set-code="handleAddOrUpdate"
        @cancel="isGoogleCodeMounted = false"
    />
</template>
