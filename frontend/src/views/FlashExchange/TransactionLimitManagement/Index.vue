<script setup lang="ts">
import TransactionLimitDrawer from './drawer/TransactionLimitDrawer.vue'
import type { FlashOption, SwapLimitItem } from '@/api/flashExchange'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import useConfirmAction from '@/use/useConfirmAction'
import { buildTableFetchResult } from '@/utils/table'
import flashExchangeApi from '@/api/flashExchange'
import { Message } from '@arco-design/web-vue'
import tagApi from '@/api/userApi/tag'
import type {
    ColumnType,
    SearchOption,
    TableFetchResult,
    TableSearchWrapExpose,
    TableToolbarButtonConfig,
} from '@/interface/TableType'
import { fetchTradeOptions, formatTradeOptionLabel } from '@/utils/tradeOptions'
import { resolveLabelTagList, type LabelTagOption } from '@/utils/labelTags'
import { getFlashLimitRangeText } from '@/utils/rangeText'

interface TransactionLimitDrawerExpose {
    open: (mode?: 'add' | 'edit' | 'info', source?: SwapLimitItem) => void
}

const { t } = useI18n()
const { confirmAndRun } = useConfirmAction()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)
const transactionLimitModalRef = ref<TransactionLimitDrawerExpose | null>(null)

const tradeOptions = ref<FlashOption[]>([])
const tagOptions = ref<LabelTagOption[]>([])
const hasLoadedFilterOptions = ref(false)
const filterOptionsLoadingPromise = ref<Promise<void> | null>(null)

/**
 * TableSearchWrap 的行操作回调参数是通用 Record，
 * 页面层在这里做一次类型收窄，避免重复断言。
 */
const toSwapLimitItem = (record: Record<string, unknown>): SwapLimitItem =>
    record as unknown as SwapLimitItem

const rangeOptions = computed(() => [
    { label: t('全局'), value: 1 },
    { label: t('用户标签'), value: 2 },
    { label: t('用户'), value: 3 },
])

const statusOptions = computed(() => [
    { label: t('启用'), value: 1 },
    { label: t('禁用'), value: 2 },
])

const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('交易对'),
        modelKey: 'tradeId',
        type: 'select',
        value: null,
        options: tradeOptions.value.map((item) => ({
            label: formatTradeOptionLabel(item),
            value: item.value,
        })),
    },
    {
        label: t('控制范围'),
        modelKey: 'limitRange',
        type: 'select',
        value: null,
        options: rangeOptions.value,
    },
    {
        label: t('状态'),
        modelKey: 'status',
        type: 'select',
        value: null,
        options: statusOptions.value,
    },
])

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'add',
        text: t('新增'),
        type: 'primary',
        onClick: () => {
            transactionLimitModalRef.value?.open('add')
        },
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id', fixed: 'left', sorter: false },
    { title: t('交易对'), dataIndex: 'tradeName', sorter: false },
    {
        title: t('限制范围'),
        dataIndex: 'limitRange',
        slotName: 'limitRange',
        sorter: false,
    },
    {
        title: t('范围详情'),
        dataIndex: 'limitValueName',
        sorter: false,
        cellPreset: {
            type: 'labelTags',
            labelListField: 'limitValueTagList',
            labelNamesField: 'limitValueName',
            maxVisible: 4,
            renderWhen: {
                field: 'limitRange',
                values: [2],
            },
            fallbackTextField: 'limitValueName',
            fallbackTooltipField: 'limitValueName',
        },
    },
    { title: t('最小下单金额'), dataIndex: 'amountLimitMin', sorter: false },
    { title: t('最大下单金额'), dataIndex: 'amountLimitMax', sorter: false },
    { title: t('最小单价'), dataIndex: 'priceLimitMin', sorter: false },
    { title: t('最大单价'), dataIndex: 'priceLimitMax', sorter: false },
    {
        title: t('买入浮动最小值'),
        dataIndex: 'minBuyRate',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
    {
        title: t('买入浮动最大值'),
        dataIndex: 'maxBuyRate',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
    {
        title: t('卖出浮动最小值'),
        dataIndex: 'minSellRate',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
    {
        title: t('卖出浮动最大值'),
        dataIndex: 'maxSellRate',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
    { title: t('每小时限次'), dataIndex: 'tradeLimitHour', sorter: false },
    { title: t('每天限次'), dataIndex: 'tradeLimitDay', sorter: false },
    {
        title: t('状态'),
        dataIndex: 'status',
        sorter: false,
        cellPreset: {
            type: 'statusText',
            preset: 'account',
        },
    },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        sorter: false,
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'edit',
                    text: t('编辑'),
                    onClick: (record) => {
                        transactionLimitModalRef.value?.open('edit', toSwapLimitItem(record))
                    },
                },
                {
                    buttonKey: 'delete',
                    text: t('删除'),
                    status: 'danger',
                    show: (record) =>
                        Number(record.status) === 2 && Number(record.limitRange) !== 1,
                    onClick: (record) => {
                        handleDelete(toSwapLimitItem(record))
                    },
                },
                {
                    buttonKey: 'info',
                    text: t('详情'),
                    onClick: (record) => {
                        transactionLimitModalRef.value?.open('info', toSwapLimitItem(record))
                    },
                },
            ],
        },
    },
])

const fetchLimitList = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<Record<string, unknown>>> => {
    /**
     * 查询参数保持原样透传给后端（例如 select 的 null），
     * 这里只兜底分页字段，保证 TableSearchWrap 和接口分页契约稳定。
     */
    const requestParams = {
        ...params,
        pageNo: Number(params.pageNo || 1),
        pageSize: Number(params.pageSize || 20),
    }
    const response = await flashExchangeApi.getSwapLimitPage(
        requestParams as Parameters<typeof flashExchangeApi.getSwapLimitPage>[0],
    )

    const normalizedResult = buildTableFetchResult<Record<string, unknown>>({
        response,
        params: requestParams,
    })

    return {
        ...normalizedResult,
        list: normalizedResult.list.map((item) => {
            const row = item as Record<string, unknown>
            if (Number(row.limitRange) !== 2) return row

            return {
                ...row,
                limitValueTagList: resolveLabelTagList(row.limitValue, tagOptions.value),
            }
        }),
    }
}

const loadTradeOptions = async (): Promise<void> => {
    tradeOptions.value = await fetchTradeOptions()
}

const loadTagOptions = async (): Promise<void> => {
    tagOptions.value = await tagApi.getTagList()
}

/**
 * 下拉加载兜底：
 * - 首次进入页面（onMounted）必请求
 * - keep-alive 激活时复用结果，避免重复请求
 */
const ensureFilterOptionsLoaded = async (): Promise<void> => {
    if (hasLoadedFilterOptions.value) return
    if (filterOptionsLoadingPromise.value) {
        await filterOptionsLoadingPromise.value
        return
    }

    filterOptionsLoadingPromise.value = Promise.all([loadTradeOptions(), loadTagOptions()])
        .then(() => undefined)
        .finally(() => {
            filterOptionsLoadingPromise.value = null
        })

    await filterOptionsLoadingPromise.value
    hasLoadedFilterOptions.value = true
}

const handleDelete = (record: SwapLimitItem): void => {
    confirmAndRun({
        title: t('删除限额'),
        content: t('你确定要删除该限额吗？'),
        onOk: async () => {
            await flashExchangeApi.deleteSwapLimit({ id: String(record.id) })
            Message.success(t('删除成功'))
            await tableWrapRef.value?.refresh()
        },
    })
}

const handleModalSuccess = async (): Promise<void> => {
    await tableWrapRef.value?.refresh()
}

useOnActivated(() => {
    ensureFilterOptionsLoaded()
        .then(() => {
            tableWrapRef.value?.reset()
        })
        .catch(() => {
            Message.error(t('加载失败，请稍后重试'))
        })
})

onMounted(() => {
    ensureFilterOptionsLoaded().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
})
</script>

<template>
    <div>
        <TableSearchWrap
            ref="tableWrapRef"
            :api-fetch="fetchLimitList"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :toolbar-buttons="toolbarButtons"
            row-key="id"
        >
            <template #limitRange="{ record }">
                {{ getFlashLimitRangeText(record.limitRange, t) }}
            </template>
        </TableSearchWrap>

        <TransactionLimitDrawer ref="transactionLimitModalRef" @success="handleModalSuccess" />
    </div>
</template>
