<script setup lang="ts">
import flashExchangeApi from '@/api/flashExchange'
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { IconExclamationCircleFill } from '@arco-design/web-vue/es/icon'
import useCurrentUserSecurity from '@/use/useCurrentUserSecurity'

interface CancelEntrustModalExpose {
    open: (id: string) => void
}

const { t } = useI18n()
const { encryptCurrentUserPassword } = useCurrentUserSecurity()

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const formState = reactive({
    id: '',
    password: '',
})

const rules = computed(() => ({
    password: [{ required: true, message: t('请输入登录密码'), trigger: 'blur' }],
}))

const open = (id: string): void => {
    formState.id = id
    visible.value = true
}

const close = (): void => {
    formRef.value?.resetFields()
    formState.id = ''
    formState.password = ''
    visible.value = false
}

/**
 * 取消委托单需要输入登录密码进行二次确认，
 * 保持老页面“高风险操作需人工确认”的交互语义。
 */
const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors || submitLoading.value) return

    submitLoading.value = true
    try {
        const password = await encryptCurrentUserPassword(formState.password)
        await flashExchangeApi.cancelEntrustOrder({
            id: formState.id,
            password,
        })
        Message.success(t('取消委托单成功'))
        emit('success')
        close()
    } finally {
        submitLoading.value = false
    }
}

defineExpose<CancelEntrustModalExpose>({
    open,
})
</script>

<template>
    <a-modal
        :visible="visible"
        :mask-closable="false"
        width="560px"
        :ok-text="t('确定')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        :cancel-button-props="{ disabled: submitLoading }"
        :ok-button-props="{ disabled: submitLoading }"
        @ok="handleSubmit"
        @cancel="close"
    >
        <template #title>
            <div class="flex items-center gap-2">
                <IconExclamationCircleFill class="text-[var(--color-warning-6)]" />
                <span>{{ t('取消提醒') }}</span>
            </div>
        </template>

        <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
            <a-form-item :label="t('登录密码')" field="password" required>
                <a-input-password
                    v-model="formState.password"
                    :placeholder="t('请输入登录密码')"
                    autocomplete="new-password"
                    allow-clear
                />
                <div class="mt-2 text-[12px] text-[var(--color-danger-6)]">
                    {{ t('当前为用户的委托单，请务必与用户沟通后再进行取消操作') }}
                </div>
            </a-form-item>
        </a-form>
    </a-modal>
</template>
