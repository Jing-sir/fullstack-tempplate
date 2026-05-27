<script setup lang="ts">
import flashExchangeApi from '@/api/flashExchange'
import type {
    EntrustDealDetailQuery,
    EntrustHistoryQuery,
    EntrustQueryBase,
    EntrustStatistics,
    FlashOption,
} from '@/api/flashExchange'
import tagApi from '@/api/userApi/tag'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableFetchResult,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { buildTableFetchResult } from '@/utils/table'
import { toTagSelectOptions } from '@/utils/selectOptions'
import { Message } from '@arco-design/web-vue'
import CancelEntrustModal from './components/CancelEntrustModal.vue'

type OrderTabKey = 'pending' | 'history' | 'detail'

interface CancelEntrustModalExpose {
    open: (id: string) => void
}

interface TagOption {
    label: string
    value: string
}

const { t } = useI18n()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)
const cancelEntrustModalRef = ref<CancelEntrustModalExpose | null>(null)

const activeTab = ref<OrderTabKey>('pending')
const statistics = ref<EntrustStatistics | null>(null)
const statisticsLoading = ref(false)

const tradeOptions = ref<FlashOption[]>([])
const currencyOptions = ref<FlashOption[]>([])
const entrustTypeOptions = ref<FlashOption[]>([])
const validPeriodOptions = ref<FlashOption[]>([])
const orderStatusOptions = ref<FlashOption[]>([])
const tagOptions = ref<TagOption[]>([])
const hasLoadedFilterOptions = ref(false)
const filterOptionsLoadingPromise = ref<Promise<void> | null>(null)

let statisticsRequestSeed = 0

const tabLabelMap: Record<OrderTabKey, string> = {
    pending: '委托中订单',
    history: '历史委托订单',
    detail: '成交详情订单',
}

const toText = (value: unknown): string =>
    value === null || typeof value === 'undefined' ? '' : String(value).trim()

/**
 * Select 查询值语义：
 * - 空值统一保持为 null（对应“全部”）
 * - 非空值保持原始值，避免把数字选项误转成字符串
 */
const toSelectValue = (value: unknown): string | number | null =>
    value === '' || value === null || typeof value === 'undefined'
        ? null
        : (value as string | number)

const toEntrustParams = (params: Record<string, unknown> = {}): Record<string, unknown> => ({
    accountId: toText(params.accountId),
    accountLabelId: toSelectValue(params.accountLabelId),
    orderNo: toText(params.orderNo),
    detailOrderNo: toText(params.detailOrderNo),
    tradeId: toSelectValue(params.tradeId),
    type: toSelectValue(params.type),
    validPeriod: toSelectValue(params.validPeriod),
    orderStatus: toSelectValue(params.orderStatus),
    sellCurrency: toSelectValue(params.sellCurrency),
    gainCurrency: toSelectValue(params.gainCurrency),
    platformFeeCurrency: toSelectValue(params.platformFeeCurrency),
    refundCurrency: toSelectValue(params.refundCurrency),
    agentName: toText(params.agentName),
    historyAgentName: toText(params.historyAgentName),
    orderTimeBegin: toText(params.orderTimeBegin),
    orderTimeEnd: toText(params.orderTimeEnd),
    endTimeBegin: toText(params.endTimeBegin),
    endTimeEnd: toText(params.endTimeEnd),
    dealTimeBegin: toText(params.dealTimeBegin),
    dealTimeEnd: toText(params.dealTimeEnd),
    pageNo: Number(params.pageNo || 1),
    pageSize: Number(params.pageSize || 20),
})

/**
 * 订单管理分页接口在不同环境可能返回不同数组字段名。
 * 这里统一兜底提取列表数据，避免“接口有数据但表格空白”。
 */
const extractEntrustList = (response: unknown): Record<string, unknown>[] => {
    if (Array.isArray(response)) {
        return response as Record<string, unknown>[]
    }

    if (!response || typeof response !== 'object') {
        return []
    }

    const directSource = response as Record<string, unknown>
    const candidateKeys = ['list', 'rows', 'records', 'pageList', 'items'] as const

    for (const key of candidateKeys) {
        const value = directSource[key]
        if (Array.isArray(value)) {
            return value as Record<string, unknown>[]
        }
    }

    const nestedKeys = ['data', 'page', 'result'] as const
    for (const nestedKey of nestedKeys) {
        const nestedValue = directSource[nestedKey]
        if (!nestedValue || typeof nestedValue !== 'object') continue

        const nestedSource = nestedValue as Record<string, unknown>
        for (const key of candidateKeys) {
            const value = nestedSource[key]
            if (Array.isArray(value)) {
                return value as Record<string, unknown>[]
            }
        }
    }

    return []
}

const asPendingQuery = (
    params: Record<string, unknown>,
): { pageNo: number; pageSize: number } & EntrustQueryBase =>
    params as unknown as { pageNo: number; pageSize: number } & EntrustQueryBase

const asHistoryQuery = (
    params: Record<string, unknown>,
): { pageNo: number; pageSize: number } & EntrustHistoryQuery =>
    params as unknown as { pageNo: number; pageSize: number } & EntrustHistoryQuery

const asDealDetailQuery = (
    params: Record<string, unknown>,
): { pageNo: number; pageSize: number } & EntrustDealDetailQuery =>
    params as unknown as { pageNo: number; pageSize: number } & EntrustDealDetailQuery

const searchConf = computed<SearchOption[]>(() => {
    const sharedSearch: SearchOption[] = [
        {
            label: t('用户UID'),
            modelKey: 'accountId',
            type: 'input',
            value: '',
        },
        {
            label: t('用户标签'),
            modelKey: 'accountLabelId',
            type: 'select',
            value: '',
            options: tagOptions.value,
        },
        {
            label: t('订单号'),
            modelKey: 'orderNo',
            type: 'input',
            value: '',
        },
        {
            label: t('交易对'),
            modelKey: 'tradeId',
            type: 'select',
            value: '',
            options: tradeOptions.value.map((item) => ({
                label: `${item.label}/USDT`,
                value: item.value,
            })),
        },
        {
            label: t('委托类型'),
            modelKey: 'type',
            type: 'select',
            value: '',
            options: entrustTypeOptions.value,
        },
        {
            label: t('有效期'),
            modelKey: 'validPeriod',
            type: 'select',
            value: '',
            options: validPeriodOptions.value,
        },
        {
            label: t('订单状态'),
            modelKey: 'orderStatus',
            type: 'select',
            value: '',
            options: orderStatusOptions.value,
        },
        {
            label: t('卖出币种'),
            modelKey: 'sellCurrency',
            type: 'select',
            value: '',
            options: currencyOptions.value,
        },
        {
            label: t('到账币种'),
            modelKey: 'gainCurrency',
            type: 'select',
            value: '',
            options: currencyOptions.value,
        },
        {
            label: t('预扣手续费币种'),
            modelKey: 'platformFeeCurrency',
            type: 'select',
            value: '',
            options: currencyOptions.value,
        },
        {
            label: t('所属代理商'),
            modelKey: activeTab.value === 'history' ? 'historyAgentName' : 'agentName',
            type: 'input',
            value: '',
        },
        {
            label: t('下单时间'),
            modelKey: ['orderTimeBegin', 'orderTimeEnd'],
            type: 'date',
            timeFormat: 'YYYY-MM-DD HH:mm:ss',
        },
    ]

    if (activeTab.value === 'pending' || activeTab.value === 'history') {
        sharedSearch.push({
            label: t('结束时间'),
            modelKey: ['endTimeBegin', 'endTimeEnd'],
            type: 'date',
            timeFormat: 'YYYY-MM-DD HH:mm:ss',
        })
    }

    if (activeTab.value === 'history') {
        sharedSearch.push({
            label: t('退回币种'),
            modelKey: 'refundCurrency',
            type: 'select',
            value: '',
            options: currencyOptions.value,
        })
    }

    if (activeTab.value === 'detail') {
        sharedSearch.push(
            {
                label: t('闪兑订单号'),
                modelKey: 'detailOrderNo',
                type: 'input',
                value: '',
            },
            {
                label: t('成交时间'),
                modelKey: ['dealTimeBegin', 'dealTimeEnd'],
                type: 'date',
                timeFormat: 'YYYY-MM-DD HH:mm:ss',
            },
        )
    }

    return sharedSearch
})

const openCancelModal = (record: Record<string, unknown>): void => {
    cancelEntrustModalRef.value?.open(String(record.id || ''))
}

const canCancelEntrust = (record: Record<string, unknown>): boolean => {
    const statusValue = Number(record.entrustStatus ?? record.orderStatus)
    return statusValue === 1
}

const tableColumns = computed<ColumnType[]>(() => {
    const commonColumns: ColumnType[] = [
        { title: t('ID'), dataIndex: 'id', fixed: 'left', sorter: false },
        { title: t('订单号'), dataIndex: 'orderNo', sorter: false },
        { title: t('用户UID'), dataIndex: 'accountId', sorter: false },
        {
            title: t('用户标签'),
            dataIndex: 'labelList',
            sorter: false,
            cellPreset: {
                type: 'labelTags',
                labelListField: 'labelList',
                labelNamesField: 'labelNames',
            },
        },
        { title: t('交易对'), dataIndex: 'tradeName', sorter: false },
        { title: t('委托类型'), dataIndex: 'typeName', sorter: false },
        { title: t('有效期'), dataIndex: 'validPeriodName', sorter: false },
        { title: t('卖出币种'), dataIndex: 'sellCurrency', sorter: false },
        { title: t('卖出数量'), dataIndex: 'sellNum', sorter: false },
        { title: t('到账币种'), dataIndex: 'gainCurrency', sorter: false },
        { title: t('预估到账数量'), dataIndex: 'gainNum', sorter: false },
        { title: t('实际到账数量'), dataIndex: 'realGainNum', sorter: false },
        { title: t('预扣手续费币种'), dataIndex: 'platformFeeCurrency', sorter: false },
        { title: t('平台手续费'), dataIndex: 'platformFee', sorter: false },
        { title: t('渠道手续费币种'), dataIndex: 'ditchFeeCurrency', sorter: false },
        { title: t('渠道手续费'), dataIndex: 'ditchFee', sorter: false },
        { title: t('下单时间'), dataIndex: 'orderTime', sorter: false },
        { title: t('结束时间'), dataIndex: 'endTime', sorter: false },
    ]

    if (activeTab.value === 'pending') {
        return [
            ...commonColumns,
            { title: t('状态'), dataIndex: 'entrustStatusName', sorter: false },
            {
                title: t('操作'),
                dataIndex: 'action',
                fixed: 'right',
                sorter: false,
                cellPreset: {
                    type: 'actionButtons',
                    buttons: [
                        {
                            buttonKey: 'cancel',
                            text: t('取消委托'),
                            status: 'warning',
                            show: (record) => canCancelEntrust(record),
                            onClick: (record) => {
                                openCancelModal(record)
                            },
                        },
                    ],
                },
            },
        ]
    }

    if (activeTab.value === 'history') {
        return [
            ...commonColumns,
            { title: t('成交均价'), dataIndex: 'dealAvgPrice', sorter: false },
            { title: t('成交时间'), dataIndex: 'dealTime', sorter: false },
            { title: t('退回币种'), dataIndex: 'refundCurrency', sorter: false },
            { title: t('退回数量'), dataIndex: 'refundNum', sorter: false },
            { title: t('状态'), dataIndex: 'orderStatusName', sorter: false },
        ]
    }

    return [
        ...commonColumns,
        { title: t('闪兑订单号'), dataIndex: 'detailOrderNo', sorter: false },
        { title: t('成交均价'), dataIndex: 'dealAvgPrice', sorter: false },
        { title: t('成交时间'), dataIndex: 'dealTime', sorter: false },
    ]
})

/**
 * 统计接口和列表接口共用同一份筛选参数，
 * 并使用请求序号避免慢请求覆盖最新筛选结果。
 */
const loadStatistics = async (params: Record<string, unknown>): Promise<void> => {
    const currentSeed = ++statisticsRequestSeed
    statisticsLoading.value = true

    try {
        if (activeTab.value === 'pending') {
            statistics.value = await flashExchangeApi.getEntrustPendingStatistics(
                asPendingQuery(params),
            )
            return
        }

        if (activeTab.value === 'history') {
            statistics.value = await flashExchangeApi.getEntrustHistoryStatistics(
                asHistoryQuery(params),
            )
            return
        }

        statistics.value = await flashExchangeApi.getEntrustDealDetailStatistics(
            asDealDetailQuery(params),
        )
    } finally {
        if (currentSeed === statisticsRequestSeed) {
            statisticsLoading.value = false
        }
    }
}

const fetchOrderList = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<Record<string, unknown>>> => {
    const normalizedParams = toEntrustParams(params)

    const statisticsPromise = loadStatistics(normalizedParams)

    if (activeTab.value === 'pending') {
        const response = await flashExchangeApi.getEntrustPendingPage(
            asPendingQuery(normalizedParams),
        )
        const list = extractEntrustList(response)
        void statisticsPromise
        return buildTableFetchResult<Record<string, unknown>>({
            response,
            params: normalizedParams,
            list,
        })
    }

    if (activeTab.value === 'history') {
        const response = await flashExchangeApi.getEntrustHistoryPage(
            asHistoryQuery(normalizedParams),
        )
        const list = extractEntrustList(response)
        void statisticsPromise
        return buildTableFetchResult<Record<string, unknown>>({
            response,
            params: normalizedParams,
            list,
        })
    }

    const response = await flashExchangeApi.getEntrustDealDetailPage(
        asDealDetailQuery(normalizedParams),
    )
    const list = extractEntrustList(response)
    void statisticsPromise
    return buildTableFetchResult<Record<string, unknown>>({
        response,
        params: normalizedParams,
        list,
    })
}

const exportConfig = computed<TableExportConfig>(() => {
    if (activeTab.value === 'pending') {
        return {
            exportApi: async (params: Record<string, unknown>) =>
                flashExchangeApi.exportEntrustPending({
                    ...asPendingQuery(toEntrustParams(params)),
                    pageNo: 1,
                    pageSize: 2000,
                }),
            fileName: `${t(tabLabelMap.pending)}.xlsx`,
        }
    }

    if (activeTab.value === 'history') {
        return {
            exportApi: async (params: Record<string, unknown>) =>
                flashExchangeApi.exportEntrustHistory({
                    ...asHistoryQuery(toEntrustParams(params)),
                    pageNo: 1,
                    pageSize: 2000,
                }),
            fileName: `${t(tabLabelMap.history)}.xlsx`,
        }
    }

    return {
        exportApi: async (params: Record<string, unknown>) =>
            flashExchangeApi.exportEntrustDealDetail({
                ...asDealDetailQuery(toEntrustParams(params)),
                pageNo: 1,
                pageSize: 2000,
            }),
        fileName: `${t(tabLabelMap.detail)}.xlsx`,
    }
})

const summaryFields = computed<Array<{ key: keyof EntrustStatistics; label: string }>>(() => {
    if (activeTab.value === 'history') {
        return [
            { key: 'sellNumTotal', label: '卖出数量汇总' },
            { key: 'realSellNumTotal', label: '实际卖出数量汇总' },
            { key: 'gainNumTotal', label: '预估到账数量汇总' },
            { key: 'realGainNumTotal', label: '实际到账数量汇总' },
            { key: 'refundNumTotal', label: '退回数量汇总' },
            { key: 'platformFeeTotal', label: '平台手续费汇总' },
            { key: 'ditchFeeTotal', label: '渠道手续费汇总' },
        ]
    }

    return [
        { key: 'sellNumTotal', label: '卖出数量汇总' },
        { key: 'realSellNumTotal', label: '实际卖出数量汇总' },
        { key: 'gainNumTotal', label: '预估到账数量汇总' },
        { key: 'realGainNumTotal', label: '实际到账数量汇总' },
        { key: 'platformFeeTotal', label: '平台手续费汇总' },
        { key: 'ditchFeeTotal', label: '渠道手续费汇总' },
    ]
})

const summaryList = computed(() =>
    summaryFields.value.map((item) => ({
        ...item,
        value: statistics.value?.[item.key] || '--',
    })),
)

const loadFilterOptions = async (): Promise<void> => {
    const [trades, currencies, types, periods, statuses, tags] = await Promise.all([
        flashExchangeApi.getTradeOptions(),
        flashExchangeApi.getEntrustCurrencyOptions(),
        flashExchangeApi.getEntrustTypeOptions(),
        flashExchangeApi.getEntrustValidPeriodOptions(),
        flashExchangeApi.getEntrustOrderStatusOptions(),
        tagApi.getTagList(),
    ])

    tradeOptions.value = trades
    currencyOptions.value = currencies
    entrustTypeOptions.value = types
    validPeriodOptions.value = periods
    orderStatusOptions.value = statuses
    tagOptions.value = toTagSelectOptions(tags)
}

/**
 * 过滤项加载兜底：
 * 1. 首次进入页面（onMounted）必触发请求
 * 2. keep-alive 激活时复用已加载结果，避免重复请求
 * 3. 失败时允许下次重试，不锁死加载状态
 */
const ensureFilterOptionsLoaded = async (): Promise<void> => {
    if (hasLoadedFilterOptions.value) return
    if (filterOptionsLoadingPromise.value) {
        await filterOptionsLoadingPromise.value
        return
    }

    filterOptionsLoadingPromise.value = loadFilterOptions()
    try {
        await filterOptionsLoadingPromise.value
        hasLoadedFilterOptions.value = true
    } finally {
        filterOptionsLoadingPromise.value = null
    }
}

const handleTabChange = (): void => {
    statistics.value = null
    statisticsRequestSeed += 1
    tableWrapRef.value?.reset()
}

const handleCancelSuccess = async (): Promise<void> => {
    await tableWrapRef.value?.refresh()
}

useOnActivated(() => {
    ensureFilterOptionsLoaded().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
    tableWrapRef.value?.reset()
})

onMounted(() => {
    ensureFilterOptionsLoaded().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
})
</script>

<template>
    <div class="flex flex-col gap-4">
        <a-tabs v-model:active-key="activeTab" type="rounded" @change="handleTabChange">
            <a-tab-pane key="pending" :title="t('委托中')" />
            <a-tab-pane key="history" :title="t('历史委托')" />
            <a-tab-pane key="detail" :title="t('成交详情')" />
        </a-tabs>

        <TableSearchWrap
            ref="tableWrapRef"
            :api-fetch="fetchOrderList"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :export-config="exportConfig"
            :enable-column-sort="false"
            row-key="id"
        >
            <template #totalWrap>
                <div class="flex flex-wrap items-center gap-2 text-[12px] text-[var(--app-text-muted)]">
                    <span v-if="statisticsLoading">{{ t('统计中...') }}</span>
                    <template v-else>
                        <span v-for="item in summaryList" :key="item.key" class="rounded bg-[var(--color-fill-2)] px-2 py-1">
                            {{ t(item.label) }}: {{ item.value }}
                        </span>
                    </template>
                </div>
            </template>
        </TableSearchWrap>

        <CancelEntrustModal ref="cancelEntrustModalRef" @success="handleCancelSuccess" />
    </div>
</template>
