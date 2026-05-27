<script setup lang="ts">
import flashExchangeApi from '@/api/flashExchange'
import type { FlashOption, SwapRateItem } from '@/api/flashExchange'
import tagApi from '@/api/userApi/tag'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableFetchResult,
    TableSearchWrapExpose,
    TableToolbarButtonConfig,
} from '@/interface/TableType'
import useConfirmAction from '@/use/useConfirmAction'
import { buildTableFetchResult } from '@/utils/table'
import { Message } from '@arco-design/web-vue'
import { fetchTradeOptions, formatTradeOptionLabel } from '@/utils/tradeOptions'
import { resolveLabelTagList, type LabelTagOption } from '@/utils/labelTags'
import { getFlashLimitRangeText } from '@/utils/rangeText'
import TariffConfigDrawer from './drawer/TariffConfigDrawer.vue'

interface TariffConfigDrawerExpose {
    open: (mode?: 'add' | 'edit' | 'info', source?: SwapRateItem) => void
}

const { t } = useI18n()
const { confirmAndRun } = useConfirmAction()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)
const tariffConfigModalRef = ref<TariffConfigDrawerExpose | null>(null)

const tradeOptions = ref<FlashOption[]>([])
const tagOptions = ref<LabelTagOption[]>([])
const hasLoadedFilterOptions = ref(false)
const filterOptionsLoadingPromise = ref<Promise<void> | null>(null)

/**
 * TableSearchWrap 的操作列回调统一拿到 Record，
 * 页面层在这里做一次显式类型收敛，避免每个按钮重复断言。
 */
const toSwapRateItem = (record: Record<string, unknown>): SwapRateItem =>
    record as unknown as SwapRateItem

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
            tariffConfigModalRef.value?.open('add')
        },
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id', fixed: 'left', sorter: false },
    { title: t('交易对'), dataIndex: 'tradeName', sorter: false },
    {
        title: t('Taker费率'),
        dataIndex: 'taker',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
    {
        title: t('Maker费率'),
        dataIndex: 'maker',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
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
                        tariffConfigModalRef.value?.open('edit', toSwapRateItem(record))
                    },
                },
                {
                    buttonKey: 'delete',
                    text: t('删除'),
                    status: 'danger',
                    show: (record) =>
                        Number(record.status) === 2 && Number(record.limitRange) !== 1,
                    onClick: (record) => {
                        handleDelete(toSwapRateItem(record))
                    },
                },
                {
                    buttonKey: 'info',
                    text: t('详情'),
                    onClick: (record) => {
                        tariffConfigModalRef.value?.open('info', toSwapRateItem(record))
                    },
                },
            ],
        },
    },
])

const fetchRateList = async (
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
    const response = await flashExchangeApi.getSwapRatePage(
        requestParams as Parameters<typeof flashExchangeApi.getSwapRatePage>[0],
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

    filterOptionsLoadingPromise.value = Promise.all([loadTradeOptions(), loadTagOptions()]).then(
        () => undefined,
    )

    try {
        await filterOptionsLoadingPromise.value
        hasLoadedFilterOptions.value = true
    } finally {
        filterOptionsLoadingPromise.value = null
    }
}

const handleDelete = (record: SwapRateItem): void => {
    confirmAndRun({
        title: t('删除费率'),
        content: t('你确定要删除该费率吗？'),
        onOk: async () => {
            await flashExchangeApi.deleteSwapRate({ id: String(record.id) })
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
            :api-fetch="fetchRateList"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :toolbar-buttons="toolbarButtons"
            row-key="id"
        >
            <template #limitRange="{ record }">
                {{ getFlashLimitRangeText(record.limitRange, t) }}
            </template>
        </TableSearchWrap>

        <TariffConfigDrawer ref="tariffConfigModalRef" @success="handleModalSuccess" />
    </div>
</template>
