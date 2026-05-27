<script setup lang="ts">
import flashExchangeApi from '@/api/flashExchange'
import type { FlashOption, SaveSwapRatePayload, SwapRateItem } from '@/api/flashExchange'
import tagApi from '@/api/userApi/tag'
import SwapConfigWarningModal from '@/views/FlashExchange/components/SwapConfigWarningModal.vue'
import type { LabelTagOption } from '@/utils/labelTags'
import { fetchTradeOptions } from '@/utils/tradeOptions'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import cloneDeep from 'lodash-es/cloneDeep'
import { DECIMAL_SIX, COMMA_NUMBERS } from '@/utils/constant'

interface TariffConfigModalExpose {
    open: (mode?: 'add' | 'edit' | 'info', source?: SwapRateItem) => void
}

type ModalMode = 'add' | 'edit' | 'info'

const { t } = useI18n()

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const mode = ref<ModalMode>('add')
const submitLoading = ref(false)

const formRef = ref<FormInstance>()
const warningModalRef = ref<InstanceType<typeof SwapConfigWarningModal> | null>(null)

const defaultFormState: SaveSwapRatePayload = {
    id: '',
    limitRange: 1,
    limitValue: undefined,
    maker: '',
    status: 2,
    taker: '',
    tradeId: undefined,
}

const formState = reactive<SaveSwapRatePayload>(cloneDeep(defaultFormState))
const infoState = ref<SwapRateItem | null>(null)

const tradeOptions = ref<FlashOption[]>([])
const tagOptions = ref<LabelTagOption[]>([])

const rangeValueCache = ref<Record<number, string | string[] | undefined>>({
    2: undefined,
    3: '',
})

const modalTitle = computed(() => {
    if (mode.value === 'add') return t('新增费率')
    if (mode.value === 'edit') return t('编辑费率')
    return t('查看费率')
})

const isReadonly = computed(() => mode.value === 'info')
const overallDisable = computed(() => mode.value === 'edit' && Number(formState.limitRange) === 1)

const rangeOptions = computed(() => [
    { value: 1, label: t('全局') },
    { value: 2, label: t('用户标签') },
    { value: 3, label: t('用户') },
])

const statusOptions = computed(() => [
    { value: 1, label: t('启用') },
    { value: 2, label: t('禁用') },
])

const rangeLabel = computed(() => {
    if (Number(formState.limitRange) === 2) return t('用户标签')
    return t('用户UID')
})

const asArray = <T,>(value: T | T[] | undefined): T[] => {
    if (Array.isArray(value)) return value
    if (typeof value === 'undefined' || value === null || value === '') return []
    return [value]
}

const feeValidator =
    (label: string) =>
    async (value: unknown): Promise<void> => {
        if (value === '' || value === null || typeof value === 'undefined') {
            return Promise.reject(new Error(t('请输入{label}', { label })))
        }

        if (Number.isNaN(Number(value))) {
            return Promise.reject(new Error(t('请输入数字')))
        }

        if (Number(value) < 0) {
            return Promise.reject(new Error(t('不能输入负数')))
        }

        if (!DECIMAL_SIX.test(String(value))) {
            return Promise.reject(new Error(t('最多只能输入6位小数')))
        }

        if (Number(value) > 999999999) {
            return Promise.reject(new Error(t('最大只能输入999999999')))
        }

        return Promise.resolve()
    }

const limitValueValidator = async (value: unknown): Promise<void> => {
    if (Number(formState.limitRange) === 1) {
        return Promise.resolve()
    }

    if (!value || (Array.isArray(value) && value.length === 0)) {
        return Promise.reject(new Error(t('请输入{label}', { label: rangeLabel.value })))
    }

    if (Number(formState.limitRange) === 3 && !COMMA_NUMBERS.test(String(value))) {
        return Promise.reject(new Error(t('只能输入数字和英文逗号')))
    }

    return Promise.resolve()
}

const rules = computed<Record<string, FieldRule[]>>(() => ({
    tradeId: [{ required: true, message: t('请选择交易对'), trigger: 'change' }],
    limitRange: [{ required: true, message: t('请选择限制范围'), trigger: 'change' }],
    maker: [{ required: true, validator: feeValidator(t('Maker手续费')), trigger: 'blur' }],
    taker: [{ required: true, validator: feeValidator(t('Taker手续费')), trigger: 'blur' }],
    status: [{ required: true, message: t('请选择状态'), trigger: 'change' }],
    limitValue: [{ required: true, validator: limitValueValidator, trigger: 'blur' }],
}))

const loadTradeOptions = async (): Promise<void> => {
    tradeOptions.value = await fetchTradeOptions()
}

const loadTagOptions = async (): Promise<void> => {
    const list = await tagApi.getTagList()
    tagOptions.value = list.map((item) => ({
        id: String(item.id),
        name: String(item.name),
        color: String(item.color),
    }))
}

const resetFormState = (): void => {
    Object.assign(formState, cloneDeep(defaultFormState))
    infoState.value = null
    rangeValueCache.value = {
        2: undefined,
        3: '',
    }
}

const close = (): void => {
    visible.value = false
    formRef.value?.resetFields()
    resetFormState()
}

const normalizeLimitValueForSubmit = (): string | undefined => {
    if (Number(formState.limitRange) === 1) {
        return undefined
    }

    if (Array.isArray(formState.limitValue)) {
        return formState.limitValue.join(',')
    }

    return formState.limitValue ? String(formState.limitValue) : undefined
}

const handleRangeChange = (): void => {
    formRef.value?.clearValidate('limitValue')
}

const filterTagOption = (keyword: string, option: { value?: string; label?: string }): boolean => {
    const labels = keyword
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

    if (!labels.length) return true

    const target = String(option.label || '').toLowerCase()
    return labels.some((item) => target.includes(item))
}

const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors || submitLoading.value || isReadonly.value) return

    submitLoading.value = true
    try {
        const response = await flashExchangeApi.saveSwapRate({
            ...formState,
            limitValue: normalizeLimitValueForSubmit(),
        })

        if (!response.result) {
            warningModalRef.value?.open(response, Number(formState.limitRange), tagOptions.value)
            return
        }

        Message.success(t('操作成功'))
        emit('success')
        close()
    } finally {
        submitLoading.value = false
    }
}

/**
 * 打开弹窗时保持老逻辑：
 * - edit/info 直接回填数据
 * - limitRange=2 时把 limitValue 拆成数组供多选控件使用
 */
const open = async (nextMode: ModalMode = 'add', source?: SwapRateItem): Promise<void> => {
    mode.value = nextMode
    resetFormState()

    await loadTradeOptions()

    if (nextMode !== 'add' && source) {
        Object.assign(formState, {
            ...source,
            limitValue:
                Number(source.limitRange) === 2
                    ? String(source.limitValue || '')
                          .split(',')
                          .filter(Boolean)
                    : source.limitValue,
        })
        infoState.value = {
            ...source,
        }

        rangeValueCache.value[2] =
            Number(source.limitRange) === 2 ? asArray(formState.limitValue) : undefined
        rangeValueCache.value[3] =
            Number(source.limitRange) === 3 ? String(source.limitValue || '') : ''
    }

    if (Number(formState.limitRange) === 2) {
        await loadTagOptions()
    }

    visible.value = true
}

watch(
    () => formState.limitRange,
    async (nextValue, prevValue) => {
        if (!nextValue || !prevValue || Number(nextValue) === Number(prevValue)) return

        const previousRange = Number(prevValue)
        const nextRange = Number(nextValue)

        if (previousRange !== 1) {
            rangeValueCache.value[previousRange] = Array.isArray(formState.limitValue)
                ? [...formState.limitValue]
                : String(formState.limitValue || '')
        }

        if (nextRange === 2) {
            if (!tagOptions.value.length) {
                await loadTagOptions()
            }
            const cachedValue = rangeValueCache.value[2]
            formState.limitValue = Array.isArray(cachedValue) ? [...cachedValue] : []
        } else if (nextRange === 3) {
            formState.limitValue = String(rangeValueCache.value[3] || '')
        } else {
            formState.limitValue = undefined
        }

        handleRangeChange()
    },
)

defineExpose<TariffConfigModalExpose>({
    open,
})
</script>

<template>
    <a-drawer
        v-model:visible="visible"
        :width="700"
        :title="modalTitle"
        :mask-closable="false"
        :ok-text="isReadonly ? t('确定') : t('确定')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        @ok="isReadonly ? close() : handleSubmit()"
        @cancel="close"
    >
        <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
            <a-form-item :label="t('交易对')" field="tradeId" :required="!isReadonly">
                <div v-if="!isReadonly" class="flex items-center gap-2">
                    <a-select
                        v-model="formState.tradeId"
                        :placeholder="t('请选择交易对')"
                        class="flex-1"
                        :disabled="overallDisable"
                        allow-clear
                    >
                        <a-option
                            v-for="option in tradeOptions"
                            :key="String(option.value)"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </a-option>
                    </a-select>
                    <span>/ USDT</span>
                </div>
                <div v-else>{{ infoState?.tradeName || '--' }}</div>
            </a-form-item>

            <a-form-item :label="t('Taker手续费')" field="taker" :required="!isReadonly">
                <template v-if="!isReadonly">
                    <a-input
                        v-model="formState.taker"
                        :placeholder="t('请输入Taker手续费')"
                        allow-clear
                    >
                        <template #suffix>%</template>
                    </a-input>
                </template>
                <div v-else>{{ formState.taker }}%</div>
            </a-form-item>

            <a-form-item :label="t('Maker手续费')" field="maker" :required="!isReadonly">
                <template v-if="!isReadonly">
                    <a-input
                        v-model="formState.maker"
                        :placeholder="t('请输入Maker手续费')"
                        allow-clear
                    >
                        <template #suffix>%</template>
                    </a-input>
                </template>
                <div v-else>{{ formState.maker }}%</div>
            </a-form-item>

            <a-form-item :label="t('限制范围')" field="limitRange" :required="!isReadonly">
                <template v-if="!isReadonly">
                    <a-radio-group
                        v-model="formState.limitRange"
                        :disabled="overallDisable"
                        @change="handleRangeChange"
                    >
                        <a-radio
                            v-for="option in rangeOptions"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </a-radio>
                    </a-radio-group>
                </template>
                <div v-else>
                    {{
                        rangeOptions.find(
                            (item) => Number(item.value) === Number(formState.limitRange),
                        )?.label || '--'
                    }}
                </div>
            </a-form-item>

            <a-form-item
                v-if="Number(formState.limitRange) !== 1"
                :label="rangeLabel"
                field="limitValue"
                :required="!isReadonly"
            >
                <template v-if="!isReadonly">
                    <a-select
                        v-if="Number(formState.limitRange) === 2"
                        v-model="formState.limitValue"
                        mode="multiple"
                        :placeholder="t('请选择用户标签')"
                        allow-clear
                        :max-tag-count="4"
                        :filter-option="filterTagOption"
                        :options="
                            tagOptions.map((item) => ({
                                label: item.name,
                                value: item.id,
                                color: item.color,
                            }))
                        "
                    >
                        <template #option="{ data }">
                            <a-tag :color="data.color">{{ data.label }}</a-tag>
                        </template>
                    </a-select>

                    <a-input
                        v-else
                        v-model="formState.limitValue"
                        :placeholder="t('请输入用户UID，用英文逗号隔开')"
                        allow-clear
                    />
                </template>

                <template v-else>
                    <a-tooltip :content="infoState?.limitValueName || '--'">
                        <div class="max-w-[420px] truncate">
                            <template v-if="Number(formState.limitRange) === 2">
                                <a-tag
                                    v-for="tagId in String(infoState?.limitValue || '')
                                        .split(',')
                                        .filter(Boolean)"
                                    :key="tagId"
                                    class="mr-1"
                                    :color="
                                        tagOptions.find((item) => String(item.id) === String(tagId))
                                            ?.color
                                    "
                                >
                                    {{
                                        tagOptions.find((item) => String(item.id) === String(tagId))
                                            ?.name || tagId
                                    }}
                                </a-tag>
                            </template>
                            <span v-else>{{ infoState?.limitValueName || '--' }}</span>
                        </div>
                    </a-tooltip>
                </template>
            </a-form-item>

            <a-form-item :label="t('状态')" field="status" :required="!isReadonly">
                <template v-if="!isReadonly">
                    <a-radio-group
                        v-model="formState.status"
                        :disabled="overallDisable && Number(infoState?.tradeStatus || 0) === 1"
                    >
                        <a-radio
                            v-for="option in statusOptions"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </a-radio>
                    </a-radio-group>
                </template>
                <div v-else>
                    {{
                        statusOptions.find(
                            (item) => Number(item.value) === Number(formState.status),
                        )?.label || '--'
                    }}
                </div>
            </a-form-item>
        </a-form>
    </a-drawer>

    <SwapConfigWarningModal ref="warningModalRef" />
</template>
