<template>
    <!--
        返佣业务配置列表：
        - 多条件搜索：业务类型/卡片类型/生效时间/状态/渠道名称/卡片名称/合伙人用户UID
        - 渠道名称和卡片名称 options 来自 /ditchCardInfo/ditchInfo 接口，页面加载时请求
        - 批量操作：批量开启/关闭/删除（含权限控制和禁用逻辑）
        - 操作列：编辑（调用编辑 Drawer）
        - 状态列：cellPreset statusText（kolRebateState），启停通过操作列按钮触发
    -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
        :toolbar-buttons="toolbarButtons"
        :row-selection="rowSelection"
        @selection-change="handleSelectionChange"
    />

    <RebateConfigFormDrawer
        v-if="modalVisible"
        :visible="modalVisible"
        :type="modalType"
        :active-data="activeRecord"
        :ditch-info-list="ditchInfoList"
        @update:visible="modalVisible = $event"
        @close="modalVisible = false"
        @success="handleRefresh"
    />
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { useOnActivated } from '@/use/useOnActivated'
import { buildTableFetchResult } from '@/utils/table'
import useConfirmAction from '@/use/useConfirmAction'
import kolApi from '@/api/kolConfiguration/index'
import type { KolRebateConfItem, DitchInfoItem } from '@/api/kolConfiguration/index'
import RebateConfigFormDrawer from './drawer/RebateConfigFormModal.vue'

const { t } = useI18n()
const { confirmAndRun } = useConfirmAction()
const tableRef = ref<TableSearchWrapExpose | null>(null)

// ── 弹窗控制 ──────────────────────────────────────────────────────────────────
const modalVisible = ref(false)
const modalType = ref<'add' | 'edit' | 'view'>('add')
const activeRecord = ref<Partial<KolRebateConfItem>>({})

const handleOpen = (type: 'add' | 'edit' | 'view', record?: KolRebateConfItem) => {
    modalType.value = type
    activeRecord.value = record ?? {}
    modalVisible.value = true
}

const handleRefresh = () => {
    selectedIds.value = []
    tableRef.value?.refresh()
}

// ── 渠道卡列表（供弹窗下拉及搜索 select 使用）────────────────────────────────
const ditchInfoList = ref<DitchInfoItem[]>([])

const loadDitchInfoList = async () => {
    try {
        ditchInfoList.value = await kolApi.fetchDitchInfoList({ state: 1 })
    } catch {
        // 加载失败不阻断页面，弹窗内下拉为空时用户可重新操作
    }
}

onMounted(loadDitchInfoList)

useOnActivated(() => {
    tableRef.value?.refresh()
    loadDitchInfoList()
})

// ── 批量操作：行选择 ──────────────────────────────────────────────────────────
const selectedIds = ref<string[]>([])

const handleSelectionChange = (keys: (string | number)[]) => {
    selectedIds.value = keys as string[]
}

const rowSelection = computed(() => ({
    selectedRowKeys: selectedIds.value,
    onChange: handleSelectionChange,
}))

// 当前搜索的 state 值，用于批量按钮禁用逻辑
const currentStateFilter = ref<number | null>(null)

// ── 搜索配置 ──────────────────────────────────────────────────────────────────
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('业务类型'),
        modelKey: 'bizType',
        type: 'select',
        options: [
            { label: t('开卡'), value: 1 },
            { label: t('充值'), value: 2 },
        ],
    },
    {
        label: t('卡片类型'),
        modelKey: 'cardType',
        type: 'select',
        options: [
            { label: t('虚拟卡'), value: 1 },
            { label: t('实体卡'), value: 2 },
        ],
    },
    {
        label: t('生效时间'),
        modelKey: ['startTime', 'endTime'],
        type: 'date',
    },
    {
        label: t('状态'),
        modelKey: 'state',
        type: 'select',
        options: [
            { label: t('已开启'), value: 1 },
            { label: t('已关闭'), value: 2 },
        ],
    },
    {
        label: t('渠道名称'),
        modelKey: 'ditchName',
        type: 'select',
        options: ditchInfoList.value.map((d) => ({ label: d.name, value: d.name })),
    },
    {
        label: t('卡片名称'),
        modelKey: 'cardName',
        type: 'select',
        options: ditchInfoList.value.map((d) => ({ label: d.name, value: d.name })),
    },
    {
        label: t('合伙人用户UID'),
        modelKey: 'accountId',
        type: 'input',
        placeholder: t('请输入'),
    },
])

// ── 表格列 ────────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: 'ID', dataIndex: 'id', fixed: 'left' },
    { title: t('业务类型'), dataIndex: 'bizTypeName' },
    { title: t('卡片类型'), dataIndex: 'cardTypeName' },
    { title: t('渠道名称'), dataIndex: 'ditchName' },
    { title: t('卡片名称'), dataIndex: 'cardName' },
    { title: t('返佣比例(%)'), dataIndex: 'rebateRatio', cellPreset: { type: 'percentText' } },
    { title: t('返佣范围'), dataIndex: 'rebateRangeName' },
    { title: t('范围详情'), dataIndex: 'rebateRangeValue' },
    { title: t('起始时间'), dataIndex: 'startTimeStr', sortable: { sorter: true } },
    { title: t('结束时间'), dataIndex: 'endTimeStr', sortable: { sorter: true } },
    { title: t('更新时间'), dataIndex: 'updateTime', sortable: { sorter: true } },
    {
        title: t('状态'),
        dataIndex: 'state',
        cellPreset: { type: 'statusText', preset: 'kolRebateState' },
    },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'edit',
                    text: t('编辑'),
                    type: 'text',
                    size: 'small',
                    onClick: (record) => handleOpen('edit', record as unknown as KolRebateConfItem),
                },
                {
                    // 启用（当前状态=已关闭时显示）
                    buttonKey: 'enable',
                    text: t('启用'),
                    type: 'text',
                    size: 'small',
                    show: (record) => (record as unknown as KolRebateConfItem).state === 2,
                    onClick: (record) => handleToggleState(record as unknown as KolRebateConfItem, 1),
                },
                {
                    // 停用（当前状态=已开启时显示）
                    buttonKey: 'disable',
                    text: t('停用'),
                    type: 'text',
                    size: 'small',
                    status: 'danger',
                    show: (record) => (record as unknown as KolRebateConfItem).state === 1,
                    onClick: (record) => handleToggleState(record as unknown as KolRebateConfItem, 2),
                },
            ],
        },
    },
])

// ── 接口请求 ──────────────────────────────────────────────────────────────────
const apiFetch = async (params?: Record<string, unknown>) => {
    // 记录当前搜索的 state，用于批量按钮禁用逻辑
    currentStateFilter.value = (params?.state as number | null | undefined) ?? null

    const res = await kolApi.fetchGetKolRebateConfList({
        bizType: params?.bizType as number | null | undefined,
        cardName: params?.cardName as string | null | undefined,
        cardType: params?.cardType as number | null | undefined,
        ditchName: params?.ditchName as string | null | undefined,
        accountId: params?.accountId as string | undefined,
        startTime: params?.startTime as number | undefined,
        endTime: params?.endTime as number | undefined,
        state: params?.state as number | null | undefined,
        pageNo: (params?.pageNo as number) ?? 1,
        pageSize: (params?.pageSize as number) ?? 20,
    })
    return buildTableFetchResult({ response: res, params: params ?? {} })
}

// ── 行内启停 ──────────────────────────────────────────────────────────────────
const handleToggleState = async (record: KolRebateConfItem, state: 1 | 2) => {
    await kolApi.fetchEnableKolRebateConfBatchOpenOrClose({ ids: record.id, state })
    Message.success(t('操作成功'))
    handleRefresh()
}

// ── 批量操作 ──────────────────────────────────────────────────────────────────
const handleBatchToggle = async (state: 1 | 2) => {
    await kolApi.fetchEnableKolRebateConfBatchOpenOrClose({
        ids: selectedIds.value.join(','),
        state,
    })
    Message.success(t('操作成功'))
    handleRefresh()
}

const handleBatchDelete = () => {
    confirmAndRun({
        content: t('确认批量删除选中的返佣配置吗？'),
        onOk: async () => {
            await kolApi.fetchKolRebateConfBatchDelete({ ids: selectedIds.value.join(',') })
            Message.success(t('删除成功'))
            handleRefresh()
        },
    })
}

// ── 工具栏按钮 ────────────────────────────────────────────────────────────────
const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        // 权限：后端配置 rebateBusinessConfiguration-add
        buttonKey: 'add',
        text: t('添加'),
        type: 'primary',
        onClick: () => handleOpen('add'),
    },
    {
        // 批量开启：仅当筛选状态=已关闭(2) 且有选中行时可用
        // 权限：后端配置 rebateBusinessConfiguration-batchClose
        buttonKey: 'batchClose',
        text: t('批量开启'),
        disabled: selectedIds.value.length === 0 || currentStateFilter.value !== 2,
        onClick: () => handleBatchToggle(1),
    },
    {
        // 批量关闭：仅当筛选状态=已开启(1) 且有选中行时可用
        // 权限：后端配置 rebateBusinessConfiguration-batchOpening
        buttonKey: 'batchOpening',
        text: t('批量关闭'),
        disabled: selectedIds.value.length === 0 || currentStateFilter.value !== 1,
        onClick: () => handleBatchToggle(2),
    },
    {
        // 批量删除：仅当筛选状态=已关闭(2) 且有选中行时可用
        // 权限：后端配置 rebateBusinessConfiguration-batchDeletion
        buttonKey: 'batchDeletion',
        text: t('批量删除'),
        status: 'danger',
        disabled: selectedIds.value.length === 0 || currentStateFilter.value !== 2,
        onClick: handleBatchDelete,
    },
])
</script>
