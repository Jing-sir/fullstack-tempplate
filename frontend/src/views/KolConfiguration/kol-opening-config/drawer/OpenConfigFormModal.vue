<template>
    <!--
        KOL开卡配置 新增/编辑 Drawer：
        - 合伙人用户UID：新增必填，blur 时查询用户信息回显；编辑时禁用
        - 卡费范围：radio（全部用户=1 / 指定用户=3）；编辑时禁用
        - 邮箱：当 rebateRange=3 时显示，支持多邮箱逗号分隔格式校验
        - 开卡费：数字 + 两位小数校验，单位 USDT
    -->
    <a-drawer
        v-model:visible="visibleProxy"
        :title="t(type === 'add' ? '新增开卡配置' : '编辑开卡配置')"
        :width="480"
        :mask-closable="true"
        :confirm-loading="submitLoading"
        @ok="handleSubmit"
        @cancel="handleClose"
    >
        <a-form
            ref="formRef"
            :model="formState"
            layout="vertical"
            :rules="formRules"
        >
            <a-form-item :label="t('合伙人用户UID')" field="agentAccountId">
                <a-input
                    v-model="formState.agentAccountId"
                    :disabled="isEdit"
                    :placeholder="t('请输入合伙人用户UID')"
                    @blur="handleUidBlur"
                />
                <!-- UID 查询结果回显（email 或 国际区号-手机号） -->
                <div v-if="userInfoDisplay" class="mt-1 text-xs text-gray-500">
                    {{ userInfoDisplay }}
                </div>
            </a-form-item>

            <a-form-item :label="t('卡费范围')" field="rebateRange">
                <a-radio-group v-model="formState.rebateRange" :disabled="isEdit">
                    <a-radio :value="1">{{ t('全部用户') }}</a-radio>
                    <a-radio :value="3">{{ t('指定用户') }}</a-radio>
                </a-radio-group>
            </a-form-item>

            <!-- 指定用户时才显示邮箱输入框 -->
            <a-form-item
                v-if="formState.rebateRange === 3"
                :label="t('开卡邮箱')"
                field="email"
            >
                <a-input
                    v-model="formState.email"
                    :disabled="isEdit"
                    :placeholder="t('请输入KOL下级用户邮箱，多个用逗号分隔')"
                />
            </a-form-item>

            <a-form-item :label="t('开卡费')" field="openFee">
                <a-input
                    v-model="formState.openFee"
                    :placeholder="t('请输入开卡费')"
                >
                    <template #suffix>USDT</template>
                </a-input>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import { EMAIL, DECIMAL_TWO } from '@/utils/constant'
import kolApi from '@/api/kolConfiguration/index'
import type { OpenConfigItem } from '@/api/kolConfiguration/index'

const props = defineProps<{
    visible: boolean
    type: 'add' | 'edit'
    activeData: Partial<OpenConfigItem>
}>()

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
const formRef = ref<FormInstance | null>(null)
const submitLoading = ref(false)

const isEdit = computed(() => props.type === 'edit')

const initFormState = () => ({
    agentAccountId: '',
    rebateRange: 1 as 1 | 3,
    email: '',
    openFee: '',
})

const formState = reactive(initFormState())

// UID 查询结果回显
const userInfo = ref({ email: '', globalCode: '', phone: '' })
const userInfoDisplay = computed(() => {
    if (userInfo.value.email) return userInfo.value.email
    if (userInfo.value.globalCode && userInfo.value.phone) {
        return `${userInfo.value.globalCode}-${userInfo.value.phone}`
    }
    return ''
})

const clearUserInfo = () => {
    userInfo.value = { email: '', globalCode: '', phone: '' }
}

/** UID blur 时查询用户信息，成功则回显，失败则清空 */
const handleUidBlur = async () => {
    if (!formState.agentAccountId) {
        clearUserInfo()
        return
    }
    try {
        const res = await kolApi.fetchgetAccountId({ id: formState.agentAccountId })
        userInfo.value = res
    } catch {
        clearUserInfo()
    }
}

// 多邮箱格式校验（逗号分隔，每个必须符合邮箱格式）
const validateEmail = (_: unknown, value: string) => {
    if (!value) return Promise.reject(t('请输入开卡邮箱'))
    const arr = value.split(',').filter(Boolean)
    for (const item of arr) {
        if (!EMAIL.test(item.trim())) {
            return Promise.reject(`${item.trim()} ${t('邮箱格式不正确')}`)
        }
    }
    return Promise.resolve()
}

// 开卡费校验（正数，最多两位小数）
const validateOpenFee = (_: unknown, value: string) => {
    if (!value) return Promise.reject(t('请输入开卡费'))
    if (!DECIMAL_TWO.test(value)) {
        return Promise.reject(t('请输入有效数字，最多两位小数'))
    }
    return Promise.resolve()
}

const formRules = computed(() => ({
    agentAccountId: [{ required: true, message: t('请输入合伙人用户UID') }],
    rebateRange: [{ required: true, message: t('请选择卡费范围') }],
    email: formState.rebateRange === 3
        ? [{ required: true, validator: validateEmail }]
        : [],
    openFee: [{ required: true, validator: validateOpenFee }],
}))

// 打开时回填数据（编辑模式）或重置（新增模式）
// 用 immediate: true 是因为父组件用 v-if 控制挂载，
// 组件挂载时 visible 已经是 true，watch 不会捕获到 false→true 的变化
watch(
    () => props.visible,
    (visible) => {
        if (!visible) return
        clearUserInfo()
        if (props.type === 'edit') {
            formState.agentAccountId = props.activeData.agentAccountId ?? ''
            formState.rebateRange = (props.activeData.rebateRange as 1 | 3) ?? 1
            // email 字段：列表接口返回的就是创建时存入的开卡邮箱（rebateRange=3 时的下级用户邮箱），直接回填
            formState.email = props.activeData.email ?? ''
            formState.openFee = props.activeData.openFee ?? ''
            // UID 禁用无法 blur，主动查询一次以回显用户信息
            handleUidBlur()
        } else {
            Object.assign(formState, initFormState())
        }
    },
    { immediate: true },
)

const handleSubmit = async () => {
    const valid = await formRef.value?.validate()
    if (valid) return
    submitLoading.value = true
    await kolApi.fetchgetOpenConfigAddOrUpdate({
        agentAccountId: formState.agentAccountId,
        rebateRange: formState.rebateRange,
        email: formState.rebateRange === 3 ? formState.email : '',
        openFee: formState.openFee,
        id: props.type === 'edit' ? (props.activeData.id ?? undefined) : undefined,
    }).finally(() => { submitLoading.value = false })
    Message.success(t('操作成功'))
    emit('success')
    handleClose()
}

const handleClose = () => {
    formRef.value?.resetFields()
    clearUserInfo()
    emit('close')
}
</script>
