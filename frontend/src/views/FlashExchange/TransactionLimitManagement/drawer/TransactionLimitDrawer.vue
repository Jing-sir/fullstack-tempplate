<script setup lang="ts">
import flashExchangeApi from '@/api/flashExchange'
import type { FlashOption, SaveSwapLimitPayload, SwapLimitItem } from '@/api/flashExchange'
import tagApi from '@/api/userApi/tag'
import type { LabelTagOption } from '@/utils/labelTags'
import { fetchTradeOptions } from '@/utils/tradeOptions'
import SwapConfigWarningModal from '@/views/FlashExchange/components/SwapConfigWarningModal.vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import cloneDeep from 'lodash-es/cloneDeep'
import { INTER_NUMBER, COMMA_NUMBERS } from '@/utils/constant'

interface TransactionLimitModalExpose {
    open: (mode?: 'add' | 'edit' | 'info', source?: SwapLimitItem) => void
}

type ModalMode = 'add' | 'edit' | 'info'

type LimitFormState = Omit<SaveSwapLimitPayload, 'limitValue'> & {
    limitValue?: string | string[]
}

const { t } = useI18n()

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const mode = ref<ModalMode>('add')
const submitLoading = ref(false)

const formRef = ref<FormInstance>()
const warningModalRef = ref<InstanceType<typeof SwapConfigWarningModal> | null>(null)

const defaultFormState: LimitFormState = {
    id: '',
    limitRange: 1,
    limitValue: undefined,
    status: 2,
    tradeId: undefined,
    amountLimitMin: '',
    amountLimitMax: '',
    priceLimitMin: '',
    priceLimitMax: '',
    minBuyRate: '',
    maxBuyRate: '',
    minSellRate: '',
    maxSellRate: '',
    tradeLimitHour: undefined,
    tradeLimitDay: undefined,
    tradeName: '',
    tradeStatus: undefined,
}

const formState = reactive<LimitFormState>(cloneDeep(defaultFormState))
const infoState = ref<SwapLimitItem | null>(null)

const tradeOptions = ref<FlashOption[]>([])
const tagOptions = ref<LabelTagOption[]>([])
const externalTradeLimit = ref<{ minTrade: string; maxTrade: string } | null>(null)

const rangeValueCache = ref<Record<number, string | string[] | undefined>>({
    2: undefined,
    3: '',
})

const modalTitle = computed(() => {
    if (mode.value === 'add') return t('新增限额')
    if (mode.value === 'edit') return t('编辑限额')
    return t('查看限额')
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

const getTagNameById = (id: string): string => {
    const target = tagOptions.value.find((item) => String(item.id) === String(id))
    return target?.name || id
}

const decimalValidator =
    (label: string, decimals = 8) =>
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

        const decimalRegex = new RegExp(`^(\\d+)?([.]?\\d{0,${decimals}})?$`)
        if (!decimalRegex.test(String(value))) {
            return Promise.reject(new Error(t('最多只能输入{count}位小数', { count: decimals })))
        }

        return Promise.resolve()
    }

const integerValidator =
    (label: string) =>
    async (value: unknown): Promise<void> => {
        if (value === '' || value === null || typeof value === 'undefined') {
            return Promise.resolve()
        }

        if (!INTER_NUMBER.test(String(value))) {
            return Promise.reject(new Error(t('{label}只能输入非负整数', { label })))
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
    limitValue: [{ required: true, validator: limitValueValidator, trigger: 'blur' }],
    amountLimitMin: [{ required: true, validator: decimalValidator(t('最小下单金额')), trigger: 'blur' }],
    amountLimitMax: [{ required: true, validator: decimalValidator(t('最大下单金额')), trigger: 'blur' }],
    priceLimitMin: [{ required: true, validator: decimalValidator(t('最小单价')), trigger: 'blur' }],
    priceLimitMax: [{ required: true, validator: decimalValidator(t('最大单价')), trigger: 'blur' }],
    minBuyRate: [{ required: true, validator: decimalValidator(t('买入浮动最小值'), 6), trigger: 'blur' }],
    maxBuyRate: [{ required: true, validator: decimalValidator(t('买入浮动最大值'), 6), trigger: 'blur' }],
    minSellRate: [{ required: true, validator: decimalValidator(t('卖出浮动最小值'), 6), trigger: 'blur' }],
    maxSellRate: [{ required: true, validator: decimalValidator(t('卖出浮动最大值'), 6), trigger: 'blur' }],
    tradeLimitHour: [{ validator: integerValidator(t('每小时限次')), trigger: 'blur' }],
    tradeLimitDay: [{ validator: integerValidator(t('每天限次')), trigger: 'blur' }],
    status: [{ required: true, message: t('请选择状态'), trigger: 'change' }],
}))

const loadTradeOptions = async (): Promise<void> => {
    tradeOptions.value = await fetchTradeOptions()
}

const loadTagOptions = async (): Promise<void> => {
    tagOptions.value = await tagApi.getTagList()
}

const loadExternalTradeLimit = async (): Promise<void> => {
    if (!formState.tradeId) {
        externalTradeLimit.value = null
        return
    }

    try {
        externalTradeLimit.value = await flashExchangeApi.getExternalTradeLimit({
            id: String(formState.tradeId),
        })
    } catch {
        externalTradeLimit.value = null
    }
}

const resetFormState = (): void => {
    Object.assign(formState, cloneDeep(defaultFormState))
    infoState.value = null
    externalTradeLimit.value = null
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
        const response = await flashExchangeApi.saveSwapLimit({
            ...(formState as Omit<LimitFormState, 'limitValue'>),
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
 * 打开弹窗保持和费率弹窗一致：
 * - add：清空表单
 * - edit/info：按后端原字段回填
 */
const open = async (nextMode: ModalMode = 'add', source?: SwapLimitItem): Promise<void> => {
    mode.value = nextMode
    resetFormState()

    await loadTradeOptions()

    if (nextMode !== 'add' && source) {
        Object.assign(formState, {
            ...source,
            limitValue: Number(source.limitRange) === 2 ? String(source.limitValue || '').split(',').filter(Boolean) : source.limitValue,
        })
        infoState.value = {
            ...source,
        }

        rangeValueCache.value[2] = Number(source.limitRange) === 2 ? asArray(formState.limitValue) : undefined
        rangeValueCache.value[3] = Number(source.limitRange) === 3 ? String(source.limitValue || '') : ''
    }

    if (Number(formState.limitRange) === 2) {
        await loadTagOptions()
    }

    await loadExternalTradeLimit()
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

watch(
    () => formState.tradeId,
    () => {
        if (visible.value) {
            void loadExternalTradeLimit()
        }
    },
)

defineExpose<TransactionLimitModalExpose>({
    open,
})
</script>

<template>
    <a-drawer
        v-model:visible="visible"
        :width="760"
        :title="modalTitle"
        :mask-closable="false"
        :ok-text="t('确定')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        @ok="isReadonly ? close() : handleSubmit()"
        @cancel="close"
    >
        <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <a-form-item
                    :label="t('交易对')"
                    field="tradeId"
                    :required="!isReadonly"
                    class="md:col-span-2"
                >
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
                    <div
                        v-if="externalTradeLimit"
                        class="mt-2 flex flex-wrap gap-4 text-[12px] text-[var(--app-text-muted)]"
                    >
                        <span
                            >{{ t('外部渠道最小交易数量') }}:
                            {{ externalTradeLimit.minTrade || '--' }}</span
                        >
                        <span
                            >{{ t('外部渠道最大交易数量') }}:
                            {{ externalTradeLimit.maxTrade || '--' }}</span
                        >
                    </div>
                </a-form-item>

                <a-form-item
                    :label="t('限制范围')"
                    field="limitRange"
                    :required="!isReadonly"
                    class="md:col-span-2"
                >
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
                    class="md:col-span-2"
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
                                            tagOptions.find(
                                                (item) => String(item.id) === String(tagId),
                                            )?.color
                                        "
                                    >
                                        {{ getTagNameById(String(tagId)) }}
                                    </a-tag>
                                </template>
                                <span v-else>{{ infoState?.limitValueName || '--' }}</span>
                            </div>
                        </a-tooltip>
                    </template>
                </a-form-item>

                <a-form-item
                    :label="t('最小下单金额')"
                    field="amountLimitMin"
                    :required="!isReadonly"
                >
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.amountLimitMin"
                        :placeholder="t('请输入最小下单金额')"
                        allow-clear
                    />
                    <div v-else>{{ formState.amountLimitMin || '--' }}</div>
                </a-form-item>

                <a-form-item
                    :label="t('最大下单金额')"
                    field="amountLimitMax"
                    :required="!isReadonly"
                >
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.amountLimitMax"
                        :placeholder="t('请输入最大下单金额')"
                        allow-clear
                    />
                    <div v-else>{{ formState.amountLimitMax || '--' }}</div>
                </a-form-item>

                <a-form-item :label="t('最小单价')" field="priceLimitMin" :required="!isReadonly">
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.priceLimitMin"
                        :placeholder="t('请输入最小单价')"
                        allow-clear
                    />
                    <div v-else>{{ formState.priceLimitMin || '--' }}</div>
                </a-form-item>

                <a-form-item :label="t('最大单价')" field="priceLimitMax" :required="!isReadonly">
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.priceLimitMax"
                        :placeholder="t('请输入最大单价')"
                        allow-clear
                    />
                    <div v-else>{{ formState.priceLimitMax || '--' }}</div>
                </a-form-item>

                <a-form-item
                    :label="t('买入浮动最小值')"
                    field="minBuyRate"
                    :required="!isReadonly"
                >
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.minBuyRate"
                        :placeholder="t('请输入买入浮动最小值')"
                        allow-clear
                    >
                        <template #suffix>%</template>
                    </a-input>
                    <div v-else>{{ formState.minBuyRate }}%</div>
                </a-form-item>

                <a-form-item
                    :label="t('买入浮动最大值')"
                    field="maxBuyRate"
                    :required="!isReadonly"
                >
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.maxBuyRate"
                        :placeholder="t('请输入买入浮动最大值')"
                        allow-clear
                    >
                        <template #suffix>%</template>
                    </a-input>
                    <div v-else>{{ formState.maxBuyRate }}%</div>
                </a-form-item>

                <a-form-item
                    :label="t('卖出浮动最小值')"
                    field="minSellRate"
                    :required="!isReadonly"
                >
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.minSellRate"
                        :placeholder="t('请输入卖出浮动最小值')"
                        allow-clear
                    >
                        <template #suffix>%</template>
                    </a-input>
                    <div v-else>{{ formState.minSellRate }}%</div>
                </a-form-item>

                <a-form-item
                    :label="t('卖出浮动最大值')"
                    field="maxSellRate"
                    :required="!isReadonly"
                >
                    <a-input
                        v-if="!isReadonly"
                        v-model="formState.maxSellRate"
                        :placeholder="t('请输入卖出浮动最大值')"
                        allow-clear
                    >
                        <template #suffix>%</template>
                    </a-input>
                    <div v-else>{{ formState.maxSellRate }}%</div>
                </a-form-item>

                <a-form-item :label="t('每小时限次')" field="tradeLimitHour">
                    <a-input-number
                        v-if="!isReadonly"
                        v-model="formState.tradeLimitHour"
                        :placeholder="t('请输入每小时限次')"
                        :min="0"
                        :precision="0"
                        hide-button
                        class="w-full"
                    />
                    <div v-else>{{ formState.tradeLimitHour ?? '--' }}</div>
                </a-form-item>

                <a-form-item :label="t('每天限次')" field="tradeLimitDay">
                    <a-input-number
                        v-if="!isReadonly"
                        v-model="formState.tradeLimitDay"
                        :placeholder="t('请输入每天限次')"
                        :min="0"
                        :precision="0"
                        hide-button
                        class="w-full"
                    />
                    <div v-else>{{ formState.tradeLimitDay ?? '--' }}</div>
                </a-form-item>

                <a-form-item
                    :label="t('状态')"
                    field="status"
                    :required="!isReadonly"
                    class="md:col-span-2"
                >
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
            </div>
        </a-form>
    </a-drawer>

    <SwapConfigWarningModal ref="warningModalRef" />
</template>
