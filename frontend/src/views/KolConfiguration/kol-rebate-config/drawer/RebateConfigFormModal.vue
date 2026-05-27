<template>
    <!--
        返佣业务配置 新增/编辑/查看 Drawer：
        - 业务类型、卡片名称、返佣范围：编辑时禁用
        - 返佣范围值（用户UID）：range=3 时显示
        - 生效时间：时间范围选择器，转时间戳传入接口
        - 卡片名称 options 由父页面传入（来自 /ditchCardInfo/ditchInfo 接口）
    -->
    <a-drawer
        v-model:visible="visibleProxy"
        :title="drawerTitle"
        :width="480"
        :mask-closable="false"
        :footer="isView ? false : undefined"
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
            <a-form-item :label="t('业务类型')" field="bizType">
                <a-select
                    v-model="formState.bizType"
                    :disabled="isEdit || isView"
                    :placeholder="t('请选择')"
                >
                    <a-option :value="1">{{ t('开卡') }}</a-option>
                    <a-option :value="2">{{ t('充值') }}</a-option>
                </a-select>
            </a-form-item>

            <a-form-item :label="t('卡片名称')" field="ditchCardId">
                <a-select
                    v-model="formState.ditchCardId"
                    :disabled="isEdit || isView"
                    :placeholder="t('请选择')"
                >
                    <a-option
                        v-for="item in ditchInfoList"
                        :key="item.id"
                        :value="item.id"
                    >
                        {{ item.name }}
                    </a-option>
                </a-select>
            </a-form-item>

            <a-form-item :label="t('返佣范围')" field="rebateRange">
                <a-radio-group
                    v-model="formState.rebateRange"
                    :disabled="isEdit || isView"
                >
                    <a-radio :value="1">{{ t('全局') }}</a-radio>
                    <a-radio :value="3">{{ t('用户') }}</a-radio>
                </a-radio-group>
            </a-form-item>

            <!-- 用户UID（range=3 时才显示） -->
            <a-form-item
                v-if="formState.rebateRange === 3"
                :label="t('用户UID')"
                field="rebateRangeValue"
            >
                <a-input
                    v-model="formState.rebateRangeValue"
                    :disabled="isView"
                    :placeholder="t('请输入用户UID，多个用逗号分隔')"
                />
            </a-form-item>

            <a-form-item :label="t('返佣比例')" field="rebateRatio">
                <a-input
                    v-model="formState.rebateRatio"
                    :disabled="isView"
                    :placeholder="t('请输入返佣比例')"
                >
                    <template #suffix>%</template>
                </a-input>
            </a-form-item>

            <a-form-item :label="t('生效时间')" field="time">
                <a-range-picker
                    v-model="formState.time"
                    :disabled="isView"
                    show-time
                    :placeholder="[t('开始时间'), t('结束时间')]"
                    style="%"
                    value-format="timestamp"
                />
            </a-form-item>

            <a-form-item :label="t('状态')" field="state">
                <a-radio-group v-model="formState.state" :disabled="isView">
                    <a-radio :value="1">{{ t('启用') }}</a-radio>
                    <a-radio :value="2">{{ t('关闭') }}</a-radio>
                </a-radio-group>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import kolApi from '@/api/kolConfiguration/index'
import { DECIMAL_TWO } from '@/utils/constant'
import type { KolRebateConfItem, DitchInfoItem } from '@/api/kolConfiguration/index'

const props = defineProps<{
    visible: boolean
    type: 'add' | 'edit' | 'view'
    activeData: Partial<KolRebateConfItem>
    ditchInfoList: DitchInfoItem[]
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
const isView = computed(() => props.type === 'view')

const drawerTitle = computed(() => {
    const map: Record<string, string> = { add: '新增返佣配置', edit: '编辑返佣配置', view: '查看返佣配置' }
    return t(map[props.type] ?? '返佣配置')
})

const initFormState = () => ({
    bizType: undefined as number | undefined,
    ditchCardId: undefined as string | undefined,
    rebateRange: undefined as number | undefined,
    rebateRangeValue: '' as string,
    rebateRatio: undefined as string | undefined,
    time: [] as number[],
    state: undefined as number | undefined,
    id: undefined as string | undefined,
})

const formState = reactive(initFormState())

// 返佣比例：0<x≤100，最多两位小数
const validateRebateRatio = (_: unknown, value: string | undefined) => {
    if (!value) return Promise.reject(t('请输入返佣比例'))
    const num = Number(value)
    if (Number.isNaN(num) || num <= 0 || num > 100) return Promise.reject(t('请输入 0-100 之间的数字'))
    if (!DECIMAL_TWO.test(value)) {
        return Promise.reject(t('最多两位小数'))
    }
    return Promise.resolve()
}

const formRules = computed(() => ({
    bizType: [{ required: true, message: t('请选择业务类型') }],
    ditchCardId: [{ required: true, message: t('请选择卡片') }],
    rebateRange: [{ required: true, message: t('请选择返佣范围') }],
    rebateRangeValue: formState.rebateRange === 3
        ? [{ required: true, message: t('请输入用户UID') }]
        : [],
    rebateRatio: [{ required: true, validator: validateRebateRatio }],
    time: [{ required: true, message: t('请选择生效时间') }],
    state: [{ required: true, message: t('请选择状态') }],
}))

// 打开时回填或重置
watch(
    () => props.visible,
    (visible) => {
        if (!visible) return
        if (props.type !== 'add' && props.activeData.id) {
            // 回填编辑/查看数据
            const d = props.activeData
            formState.bizType = d.bizType
            // ditchCardId 后端返回 ditchName，无 id，编辑时只用于禁用展示，不影响提交
            formState.ditchCardId = undefined
            formState.rebateRange = d.rebateRange
            formState.rebateRangeValue = d.rebateRangeValue ?? ''
            formState.rebateRatio = String(d.rebateRatio ?? '')
            formState.time = [] // startTimeStr 为格式化字符串，时间戳已丢失，编辑时需用户重新选择
            formState.state = d.state
            formState.id = d.id
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
    const [startTime, endTime] = formState.time
    await kolApi.fetchGetKolRebateConfAddOrUpdate({
        bizType: formState.bizType,
        ditchCardId: formState.ditchCardId,
        rebateRange: formState.rebateRange,
        rebateRangeValue: formState.rebateRange === 3 ? formState.rebateRangeValue : undefined,
        rebateRatio: formState.rebateRatio,
        state: formState.state,
        startTime,
        endTime,
        id: formState.id,
    }).finally(() => { submitLoading.value = false })
    Message.success(t('操作成功'))
    emit('success')
    handleClose()
}

const handleClose = () => {
    formRef.value?.resetFields()
    emit('close')
}
</script>
