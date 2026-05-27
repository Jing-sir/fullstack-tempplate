<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'

const { t } = useI18n()

const props = withDefaults(
    defineProps<{
        loading?: boolean
    }>(),
    {
        loading: false,
    },
)

const emits = defineEmits<{
    setCode: [code: string]
    cancel: []
}>()

const formRef = ref<FormInstance | null>(null)
const verificationCodeRef = ref<{ $el?: HTMLElement } | null>(null)
const visible = ref<boolean>(false)
const formState = reactive({
    code: '',
})
const instantLoading = ref(false)
let instantLoadingTimer: number | undefined

const mergedLoading = computed(() => props.loading || instantLoading.value)

const clearInstantLoadingTimer = (): void => {
    if (!instantLoadingTimer) return
    window.clearTimeout(instantLoadingTimer)
    instantLoadingTimer = undefined
}

/**
 * 输入完成后先进入瞬时 loading，避免“已经提交但界面还没变化”的体感空档。
 * 父组件真正的 loading 接管后会自动清理这里的本地 loading。
 */
const startInstantLoading = (): void => {
    instantLoading.value = true
    clearInstantLoadingTimer()
    instantLoadingTimer = window.setTimeout(() => {
        if (!props.loading) {
            instantLoading.value = false
        }
        instantLoadingTimer = undefined
    }, 900)
}

watch(
    () => props.loading,
    (loading) => {
        if (!loading) return
        instantLoading.value = false
        clearInstantLoadingTimer()
    },
)

onBeforeUnmount(() => {
    clearInstantLoadingTimer()
})

/**
 * 统一聚焦验证码输入框。
 * a-verification-code 内部由多个 Input 组成，这里通过组件根节点查找第一个可用 input。
 */
const focusVerificationCodeInput = (): void => {
    if (mergedLoading.value) return

    const firstInput = verificationCodeRef.value?.$el?.querySelector(
        'input:not([disabled]):not([readonly])',
    ) as HTMLInputElement | null
    firstInput?.focus()
}

/**
 * 仅允许输入数字。
 * 返回 false 时，Arco VerificationCode 会阻断本次字符写入。
 */
const formatVerificationCode = (value: string): string | false => {
    if (!value) return ''
    return /^\d$/.test(value) ? value : false
}

const closeDialog = (): void => {
    formState.code = ''
    instantLoading.value = false
    clearInstantLoadingTimer()
    formRef.value?.resetFields()
    visible.value = false
}

// 验证通过后由父组件继续走 2FA 校验，校验成功再决定何时关闭弹窗。
const onOk = async (): Promise<void> => {
    if (mergedLoading.value) return

    const errors = await formRef.value?.validate()
    if (errors) return

    startInstantLoading()
    emits('setCode', formState.code)
}

const onCancel = (): void => {
    if (mergedLoading.value) return
    closeDialog()
    emits('cancel')
}

/**
 * 登录场景下很多用户会从密码管理器或短信/邮件里复制 2FA。
 * 这里提供显式“粘贴验证码”按钮，兼容不熟悉快捷键的用户。
 */
const onPasteCode = async (): Promise<void> => {
    if (mergedLoading.value) return

    if (!navigator.clipboard?.readText) {
        Message.warning(t('当前浏览器不支持剪贴板读取，请使用快捷键粘贴'))
        return
    }

    try {
        const clipboardText = await navigator.clipboard.readText()
        const normalizedCode = clipboardText.replace(/\D/g, '').slice(0, 6)

        if (!normalizedCode) {
            Message.warning(t('剪贴板中没有可用验证码'))
            return
        }

        formState.code = normalizedCode
        await nextTick()
        focusVerificationCodeInput()
        // 弹窗不保留底部“验证”按钮时，粘贴满 6 位自动提交，降低一次额外操作。
        if (normalizedCode.length === 6) {
            await onOk()
        }
    } catch {
        Message.error(t('读取剪贴板失败，请手动粘贴'))
    }
}

const onShowDialog = async (val = false): Promise<void> => {
    if (!val) {
        closeDialog()
        return
    }

    formState.code = ''
    formRef.value?.resetFields()
    visible.value = val
    await nextTick()
    // 弹窗打开后自动聚焦第一个输入框，方便直接 Command/Ctrl + V。
    focusVerificationCodeInput()
}

defineExpose({ closeDialog, onShowDialog })
</script>

<template>
    <a-modal
        :title="t('2FA 验证')"
        v-model:visible="visible"
        @cancel="onCancel"
        :width="380"
        :footer="false"
    >
        <a-form ref="formRef" layout="vertical" :model="formState">
            <a-form-item
                class="google-code-form-item"
                field="code"
                :rules="[
                    { required: true, message: t('验证码必填') },
                    { minLength: 6, message: t('验证码不完整') },
                    { match: /^\d+$/, message: t('必须为数字') },
                ]"
            >
                <template #label>
                    <div class="flex min-w-0 flex-1 items-center justify-between">
                        <span>{{ t('请输入2FA') }}</span>
                        <a-button
                            type="text"
                            size="mini"
                            :loading="mergedLoading"
                            :disabled="mergedLoading"
                            class="google-code-paste-btn h-auto px-0"
                            @click.stop="onPasteCode"
                        >
                            {{ t('粘贴验证码') }}
                        </a-button>
                    </div>
                </template>
                <a-verification-code
                    ref="verificationCodeRef"
                    class="google-code-input"
                    v-model="formState.code"
                    :length="6"
                    :disabled="mergedLoading"
                    :formatter="formatVerificationCode"
                    @finish="onOk"
                />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<style scoped lang="scss">
.google-code-form-item {
    // Arco 的 label 列默认有固定宽度，2FA 标题行需要撑满后才能把“粘贴验证码”稳定贴到最右侧。
    :deep(.arco-form-item-label-col) {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }

    :deep(.arco-form-item-label-col > .arco-form-item-label) {
        width: 100%;
        display: flex;
        align-items: center;
        padding-right: 0;
    }

    :deep(.arco-form-item-label-required-symbol) {
        margin-right: 4px;
        flex-shrink: 0;
    }

    :deep(.google-code-paste-btn.arco-btn-text) {
        color: var(--color-primary-6);
    }

    :deep(.google-code-paste-btn.arco-btn-text:hover),
    :deep(.google-code-paste-btn.arco-btn-text:focus-visible),
    :deep(.google-code-paste-btn.arco-btn-text:active) {
        color: var(--color-primary-6);
        background-color: var(--app-control-hover-bg);
    }

    :deep(.google-code-input .arco-input) {
        width: 46px;
        height: 50px;
        border-radius: 6px;
        font-size: 20px;
        font-weight: 700;
    }
}
</style>
