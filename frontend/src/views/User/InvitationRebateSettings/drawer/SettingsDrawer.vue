<script setup lang="ts">
import referralApi from '@/api/userApi/referral'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'

interface ReferralConfigFormState {
    accountId: string
    createTime: string
    id: string
    rangeType: number | string
    scale: number | string
    scaleType: number | string
}

interface ReferralConfigRow extends Record<string, unknown> {
    accountId?: string
    createTime?: string
    id?: string
    rangeType?: number | string
    scale?: number | string
    scaleType?: number | string
}

const props = withDefaults(
    defineProps<{
        visible: boolean
        type: 'add' | 'edit'
        activeData?: ReferralConfigRow | null
    }>(),
    {
        activeData: null,
    },
)

const emit = defineEmits<{
    'update:visible': [value: boolean]
    close: []
    success: []
}>()

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
})

const { t } = useI18n()

const formRef = ref<FormInstance>()
const submitLoading = ref(false)

const formInitialState: ReferralConfigFormState = {
    accountId: '',
    createTime: '',
    id: '',
    rangeType: '',
    scale: '',
    scaleType: '',
}

const formState = reactive<ReferralConfigFormState>({ ...formInitialState })

/**
 * 返佣比例校验与老页面保持一致：
 * 1. 必填
 * 2. 最多两位小数
 */
const validateScale = async (value: unknown): Promise<void> => {
    if (!value) {
        return Promise.reject(new Error(t('请输入返佣百分比')))
    }

    if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
        return Promise.reject(new Error(t('最多只能输入两位小数')))
    }

    return Promise.resolve()
}

const rules = computed<Record<string, FieldRule[]>>(() => ({
    scale: [{ required: true, validator: validateScale, trigger: 'blur' }],
    accountId: [{ required: true, message: t('请输入'), trigger: 'blur' }],
    rangeType: [{ required: true, message: t('请选择'), trigger: 'change' }],
    scaleType: [{ required: true, message: t('请选择'), trigger: 'change' }],
}))

const modalTitle = computed(
    () => `${props.type === 'add' ? t('添加') : t('修改')}${t('返佣配置')}-${props.activeData?.id || ''}`,
)

const resetForm = (): void => {
    Object.assign(formState, formInitialState)
    formRef.value?.resetFields()
}

/**
 * 打开弹窗时按模式回填：
 * - add: 清空并回到默认态
 * - edit: 使用当前行数据逐字段回填
 */
watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            resetForm()
            return
        }

        if (props.type === 'add') {
            Object.assign(formState, formInitialState)
            return
        }

        const source = props.activeData || {}
        Object.assign(formState, {
            accountId: String(source.accountId || ''),
            createTime: String(source.createTime || ''),
            id: String(source.id || ''),
            rangeType: source.rangeType ?? '',
            scale: source.scale ?? '',
            scaleType: source.scaleType ?? '',
        })
    },
    { immediate: true },
)

const handleClose = (): void => {
    emit('close')
}

/**
 * 保存逻辑保持老页面语义：
 * - add 调 createReferralConfig
 * - edit 调 updateReferralConfig
 * - 成功后关闭弹窗并通知父页面刷新列表
 */
const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors || submitLoading.value) return

    submitLoading.value = true
    try {
        const payload = {
            ...formState,
        }

        if (props.type === 'add') {
            await referralApi.createReferralConfig(
                payload as Parameters<typeof referralApi.createReferralConfig>[0],
            )
        } else {
            await referralApi.updateReferralConfig(
                payload as Parameters<typeof referralApi.updateReferralConfig>[0],
            )
        }

        Message.success(t('操作成功'))
        emit('close')
        emit('success')
    } finally {
        submitLoading.value = false
    }
}
</script>

<template>
    <a-drawer
        v-model:visible="visibleProxy"
        :title="modalTitle"
        :width="480"
        :confirm-loading="submitLoading"
        :mask-closable="false"
        :ok-text="t('确定')"
        :cancel-text="t('取消')"
        @ok="handleSubmit"
        @cancel="handleClose"
    >
        <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
            <a-form-item v-if="props.type === 'add'" :label="t('类型')" field="rangeType" required>
                <a-select v-model="formState.rangeType" :placeholder="t('请选择')" allow-clear>
                    <a-option :value="1">{{ t('全局') }}</a-option>
                    <a-option :value="2">{{ t('用户') }}</a-option>
                </a-select>
            </a-form-item>

            <a-form-item v-if="Number(formState.rangeType) === 2" :label="t('账号UID')" field="accountId" required>
                <a-input v-model="formState.accountId" :placeholder="t('请输入')" allow-clear />
            </a-form-item>

            <a-form-item :label="t('返佣类型')" field="scaleType" required>
                <a-select v-model="formState.scaleType" :placeholder="t('请选择')" allow-clear>
                    <a-option :value="1">{{ t('开卡') }}</a-option>
                    <a-option :value="2">{{ t('充值') }}</a-option>
                    <a-option :value="3">{{ t('开卡减免') }}</a-option>
                </a-select>
            </a-form-item>

            <a-form-item :label="t('返佣百分比')" field="scale" required>
                <a-input-number
                    v-model="formState.scale"
                    :placeholder="t('请输入')"
                    :min="0"
                    :max="100"
                    :precision="2"
                    class="w-full"
                />
            </a-form-item>
        </a-form>
    </a-drawer>
</template>
