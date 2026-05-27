<template>
    <!-- 代理商资产列表页：支持按代理商ID/币种搜索，操作包括冻结/解冻/划转，以及导出和快照 -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
        :export-config="exportConfig"
        :toolbar-buttons="toolbarButtons"
    />

    <!-- 冻结/解冻/划转操作弹窗 -->
    <AgentAssetActionDrawer
        v-if="modalVisible"
        :visible="modalVisible"
        :type="modalType"
        :active-data="activeData"
        @update:visible="modalVisible = $event"
        @close="modalVisible = false"
        @success="handleRefresh"
    />
</template>

<script lang="ts" setup>
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import AgentAssetActionDrawer from './drawer/AgentAssetActionDrawer.vue'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type { AgentAssetItem, CoinOption, AgentOption } from '@/api/userApi/asset'
import { useOnActivated } from '@/use/useOnActivated'
import { buildTableFetchResult } from '@/utils/table'
import assetApi from '@/api/userApi/asset/index'

const { t } = useI18n()

// ─── 下拉选项 ──────────────────────────────────────────────────────────────────
const coinOptions = ref<{ label: string; value: string }[]>([])
const agentOptions = ref<{ label: string; value: string }[]>([])

const loadSelectOptions = async (): Promise<void> => {
    const [coins, agents] = await Promise.allSettled([
        assetApi.getCoinOptions(),
        assetApi.getAgentOptions(),
    ])
    if (coins.status === 'fulfilled') {
        coinOptions.value = (coins.value as CoinOption[]).map((item) => ({
            label: item.symbol,
            value: item.coinId,
        }))
    }
    if (agents.status === 'fulfilled') {
        agentOptions.value = (agents.value as AgentOption[]).map((item) => ({
            label: item.name,
            value: item.id,
        }))
    }
}

// ─── 搜索配置 ──────────────────────────────────────────────────────────────────
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('代理商ID'),
        modelKey: 'agentId',
        type: 'select',
        options: agentOptions.value,
    },
    {
        label: t('资产类型'),
        modelKey: 'coinId',
        type: 'select',
        options: coinOptions.value,
    },
])

// ─── 表格列配置 ────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id',
    },
    { title: t('资产类型'), dataIndex: 'symbol' },
    { title: t('资产人ID'), dataIndex: 'agentId', amountFormat: false,
    },
    { title: t('可用数量'), dataIndex: 'balance' },
    { title: t('冻结数量'), dataIndex: 'frozenBalance' },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'freeze',
                    text: t('冻结'),
                    type: 'text',
                    status: 'danger',
                    size: 'small',
                    show: (record) => Number(record.balance) > 0,
                    onClick: (record) =>
                        handleOpenModal(record as unknown as AgentAssetItem, 'Frozen'),
                },
                {
                    buttonKey: 'unFreezze',
                    text: t('解冻'),
                    type: 'text',
                    size: 'small',
                    show: (record) => Number(record.frozenBalance) > 0,
                    onClick: (record) =>
                        handleOpenModal(record as unknown as AgentAssetItem, 'Thaw'),
                },
                {
                    buttonKey: 'transfer',
                    text: t('划转'),
                    type: 'text',
                    status: 'danger',
                    size: 'small',
                    onClick: (record) =>
                        handleOpenModal(record as unknown as AgentAssetItem, 'Transfer'),
                },
            ],
        },
    },
])

// ─── 数据获取 ──────────────────────────────────────────────────────────────────
/**
 * apiFetch 适配 TableSearchWrap 的接口签名：
 * 接收 params（包含搜索字段 + pageNo/pageSize），返回标准分页结构。
 */
const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await assetApi.getAgentAssetList(
        (params ?? {}) as Parameters<typeof assetApi.getAgentAssetList>[0],
    )
    return buildTableFetchResult({ response: res, params: params ?? {} })
}

// ─── 工具栏按钮（快照） ───────────────────────────────────────────────────────────
const snapshotLoading = ref(false)
const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'snapshot',
        text: t('快照代理商资产'),
        type: 'primary' as const,
        loading: snapshotLoading.value,
        onClick: async () => {
            if (snapshotLoading.value) return
            snapshotLoading.value = true
            await assetApi.snapshotAgentAsset().finally(() => { snapshotLoading.value = false })
        },
    },
])

// ─── 导出配置 ──────────────────────────────────────────────────────────────────
/**
 * exportApi 直接返回 Blob，TableSearchWrap 内部的 ExportButton 组件
 * 统一负责触发下载，页面侧无需手动调用 downloadExcel。
 */
const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) =>
        assetApi.exportAgentAssetList(
            params as Parameters<typeof assetApi.exportAgentAssetList>[0],
        ),
    fileName: `${t('代理商资产')}.xlsx`,
    buttonKey: 'export',
}))

// ─── 弹窗逻辑 ──────────────────────────────────────────────────────────────────
const modalVisible = ref(false)
const modalType = ref<'Frozen' | 'Thaw' | 'Transfer'>('Frozen')
const activeData = ref<AgentAssetItem>({} as AgentAssetItem)

/** 打开冻结/解冻/划转弹窗 */
const handleOpenModal = (record: AgentAssetItem, type: typeof modalType.value) => {
    activeData.value = record
    modalType.value = type
    modalVisible.value = true
}

// ─── 刷新逻辑 ──────────────────────────────────────────────────────────────────
/** 弹窗操作成功后触发表格刷新 */
const tableRef = ref<TableSearchWrapExpose | null>(null)
const handleRefresh = () => {
    tableRef.value?.refresh()
}

// ─── 左侧菜单点击（onActivated）刷新表格数据 ────────────────────────────────────
// tabbar 切换（#no-refresh）时 useOnActivated 内部会跳过，保留搜索缓存；
// 点击左侧 menu（无 hash）时正常触发，请求最新数据。
useOnActivated(() => {
    tableRef.value?.refresh()
    void loadSelectOptions()
})

</script>
