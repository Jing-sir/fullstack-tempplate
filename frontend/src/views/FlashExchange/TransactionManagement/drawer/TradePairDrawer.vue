<script setup lang="ts">
import flashExchangeApi from '@/api/flashExchange'
import type { SaveTradePairPayload, TradePairItem, FlashOption } from '@/api/flashExchange'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import cloneDeep from 'lodash-es/cloneDeep'
import { INTER_NUMBER } from '@/utils/constant'

interface TradePairModalExpose {
    open: (mode?: 'add' | 'edit', source?: TradePairItem) => void
}

const { t } = useI18n()

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const mode = ref<'add' | 'edit'>('add')
const submitLoading = ref(false)

const formRef = ref<FormInstance>()

const defaultFormState: SaveTradePairPayload = {
    countPrecision: '',
    id: undefined,
    limitPriceBuySwitch: 2,
    limitPriceSellSwitch: 2,
    marketPriceBuySwitch: 2,
    marketPriceSellSwitch: 2,
    marketShow: 2,
    pricePrecision: '',
    quotaPrecision: '',
    sort: undefined,
    status: 2,
    tradeId: undefined,
    transactionShow: 2,
    marketPriceRate: 0,
}

const formState = reactive<SaveTradePairPayload>(cloneDeep(defaultFormState))

const tradeOptions = ref<FlashOption[]>([])
const sortOptions = ref<FlashOption[]>([])

const modalTitle = computed(() => (mode.value === 'add' ? t('新增交易对') : t('编辑交易对')))

const showSwitchOptions = [
    { value: 1, label: t('是') },
    { value: 2, label: t('否') },
]

const statusOptions = [
    { value: 1, label: t('上架') },
    { value: 2, label: t('下架') },
]

type TradeSwitchFieldKey =
    | 'marketPriceBuySwitch'
    | 'marketPriceSellSwitch'
    | 'limitPriceBuySwitch'
    | 'limitPriceSellSwitch'

const switchFields: Array<{ label: string; key: TradeSwitchFieldKey }> = [
    { label: t('市价单买入'), key: 'marketPriceBuySwitch' },
    { label: t('市价单卖出'), key: 'marketPriceSellSwitch' },
    { label: t('限价单买入'), key: 'limitPriceBuySwitch' },
    { label: t('限价单卖出'), key: 'limitPriceSellSwitch' },
]

const precisionFields: Array<{ label: string; key: keyof SaveTradePairPayload }> = [
    { label: t('价格精度'), key: 'pricePrecision' },
    { label: t('数量精度'), key: 'countPrecision' },
    { label: t('额度精度'), key: 'quotaPrecision' },
]

const precisionValidator = (fieldLabel: string) => async (value: unknown): Promise<void> => {
    if (value === '' || value === null || typeof value === 'undefined') {
        return Promise.reject(new Error(t('请输入{label}', { label: fieldLabel })))
    }

    if (!INTER_NUMBER.test(String(value))) {
        return Promise.reject(new Error(t('只能输入正整数')))
    }

    if (Number(value) > 99) {
        return Promise.reject(new Error(t('最大精度为99')))
    }

    return Promise.resolve()
}

const rules = computed<Record<string, FieldRule[]>>(() => ({
    tradeId: [{ required: true, message: t('请选择交易对'), trigger: 'change' }],
    sort: [{ required: true, message: t('请选择排序'), trigger: 'change' }],
    pricePrecision: [{ required: true, validator: precisionValidator(t('价格精度')), trigger: 'blur' }],
    countPrecision: [{ required: true, validator: precisionValidator(t('数量精度')), trigger: 'blur' }],
    quotaPrecision: [{ required: true, validator: precisionValidator(t('额度精度')), trigger: 'blur' }],
    marketShow: [{ required: true, message: t('请选择是否在行情区显示'), trigger: 'change' }],
    transactionShow: [{ required: true, message: t('请选择是否在交易区显示'), trigger: 'change' }],
    marketPriceBuySwitch: [{ required: true, message: t('请选择市价单买入'), trigger: 'change' }],
    marketPriceSellSwitch: [{ required: true, message: t('请选择市价单卖出'), trigger: 'change' }],
    limitPriceBuySwitch: [{ required: true, message: t('请选择限价单买入'), trigger: 'change' }],
    limitPriceSellSwitch: [{ required: true, message: t('请选择限价单卖出'), trigger: 'change' }],
    status: [{ required: true, message: t('请选择状态'), trigger: 'change' }],
}))

const resetFormState = (): void => {
    Object.assign(formState, cloneDeep(defaultFormState))
}

const close = (): void => {
    visible.value = false
    formRef.value?.resetFields()
    resetFormState()
}

const loadTradeOptions = async (): Promise<void> => {
    tradeOptions.value = await flashExchangeApi.getExternalTradeOptions()
}

const loadSortOptions = async (): Promise<void> => {
    const params = mode.value === 'edit' && formState.id ? { id: String(formState.id) } : {}
    sortOptions.value = await flashExchangeApi.getTradeSortOptions(params)
}

/**
 * 打开弹窗：
 * - add：默认值
 * - edit：按原记录回填并保留老逻辑 marketPriceRate=0
 */
const open = async (nextMode: 'add' | 'edit' = 'add', source?: TradePairItem): Promise<void> => {
    mode.value = nextMode
    resetFormState()

    if (nextMode === 'edit' && source) {
        Object.assign(formState, {
            ...source,
            marketPriceRate: 0,
        })
    }

    await Promise.all([loadTradeOptions(), loadSortOptions()])
    visible.value = true
}

const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors || submitLoading.value) return

    submitLoading.value = true
    await flashExchangeApi.saveTradePair({
        ...formState,
    }).finally(() => { submitLoading.value = false })
    Message.success(t('操作成功'))
    emit('success')
    close()
}

defineExpose<TradePairModalExpose>({
    open,
})
</script>

<template>
    <a-drawer
        v-model:visible="visible"
        :width="680"
        :mask-closable="false"
        :title="modalTitle"
        :ok-text="t('确定')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        @ok="handleSubmit"
        @cancel="close"
    >
        <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
            <a-form-item :label="t('交易对')" field="tradeId" required>
                <div class="flex items-center gap-2">
                    <a-select
                        v-model="formState.tradeId"
                        :placeholder="t('请选择交易对')"
                        class="flex-1"
                        :disabled="mode !== 'add'"
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
            </a-form-item>

            <a-form-item :label="t('排序')" field="sort" required>
                <a-select v-model="formState.sort" :placeholder="t('请选择排序')" allow-clear>
                    <a-option
                        v-for="option in sortOptions"
                        :key="String(option.value)"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </a-option>
                </a-select>
            </a-form-item>

            <a-form-item
                v-for="precisionField in precisionFields"
                :key="precisionField.key"
                :label="precisionField.label"
                :field="String(precisionField.key)"
                required
            >
                <a-input
                    v-model="formState[precisionField.key]"
                    :placeholder="t('如0.00001，输入5')"
                    allow-clear
                />
            </a-form-item>

            <a-form-item :label="t('是否在行情区显示')" field="marketShow" required>
                <a-radio-group v-model="formState.marketShow">
                    <a-radio
                        v-for="option in showSwitchOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </a-radio>
                </a-radio-group>
            </a-form-item>

            <a-form-item :label="t('是否在交易区显示')" field="transactionShow" required>
                <a-radio-group v-model="formState.transactionShow">
                    <a-radio
                        v-for="option in showSwitchOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </a-radio>
                </a-radio-group>
            </a-form-item>

            <a-form-item
                v-for="switchField in switchFields"
                :key="switchField.key"
                :label="switchField.label"
                :field="String(switchField.key)"
                required
            >
                <div class="flex items-center gap-3">
                    <a-switch
                        v-model="formState[switchField.key]"
                        :checked-value="1"
                        :unchecked-value="2"
                    />
                    <span>
                        {{ Number(formState[switchField.key]) === 1 ? t('启用') : t('关闭') }}
                    </span>
                </div>
            </a-form-item>

            <a-form-item :label="t('交易对状态')" field="status" required>
                <a-radio-group v-model="formState.status" :disabled="mode === 'add'">
                    <a-radio
                        v-for="option in statusOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </a-radio>
                </a-radio-group>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>
