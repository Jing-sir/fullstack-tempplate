<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableFetchResult,
    TableSearchWrapExpose,
    TableToolbarButtonConfig,
} from '@/interface/TableType'
import exampleApi from '@/api/example'
import type { ExampleItem } from '@/api/example'
import { buildTableFetchResult } from '@/utils/table'
import { useOnActivated } from '@/use/useOnActivated'
import useConfirmAction from '@/use/useConfirmAction'
import ExampleFormModal from './modal/FormModal.vue'

const { t } = useI18n()
const { confirmAndRun } = useConfirmAction()

const tableRef = ref<TableSearchWrapExpose | null>(null)
const formModalVisible = ref(false)
const activeRecord = ref<ExampleItem | null>(null)

/**
 * 搜索配置：
 * - 必须用 computed，保证语言切换时文案响应
 * - select 不手动添加“全部”，TableSearchWrap 内部会处理
 * - 空值默认保留 null；如果后端要求空字符串，必须在 apiFetch 里就近注释说明
 */
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('示例名称'),
        modelKey: 'name',
        type: 'input',
        placeholder: t('请输入'),
    },
    {
        label: t('状态'),
        modelKey: 'state',
        type: 'select',
        options: [
            { label: t('启用'), value: 1 },
            { label: t('禁用'), value: 2 },
        ],
    },
])

/**
 * 表格列：
 * - 时间列宽度至少 160
 * - 状态列优先使用 statusText preset
 * - 行操作优先使用 actionButtons
 * - 能用 cellPreset 表达时，不新增页面 slot
 * - 横向滚动由 TableSearchWrap 按 1550 断点和列宽总和自动处理
 */
const columns = computed<ColumnType<ExampleItem>[]>(() => [
    {
        title: t('用户UID'),
        dataIndex: 'uid',
        width: 180,
        amountFormat: false,
        cellPreset: { type: 'copyableText' },
    },
    { title: t('示例名称'), dataIndex: 'name', width: 180 },
    {
        title: t('状态'),
        dataIndex: 'state',
        width: 100,
        cellPreset: { type: 'statusText', preset: 'exampleState' },
    },
    { title: t('创建时间'), dataIndex: 'createTime', width: 180 },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        width: 220,
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'edit',
                    text: t('编辑'),
                    type: 'text',
                    size: 'small',
                    onClick: (record) => handleOpenEdit(record),
                },
                {
                    buttonKey: 'delete',
                    text: t('删除'),
                    type: 'text',
                    status: 'danger',
                    size: 'small',
                    onClick: (record) => handleDelete(record),
                },
            ],
        },
    },
])

const normalizeListParams = (params: Record<string, unknown> = {}) => ({
    pageNo: Number(params.pageNo || 1),
    pageSize: Number(params.pageSize || 20),
    name: String(params.name || ''),
    state: params.state === null || params.state === undefined ? null : Number(params.state),
})

const apiFetch = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<ExampleItem>> => {
    const normalizedParams = normalizeListParams(params)
    const response = await exampleApi.getList(normalizedParams)

    return buildTableFetchResult<ExampleItem>({
        response,
        params: normalizedParams,
    })
}

const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: (params: Record<string, unknown>) =>
        exampleApi.exportList(normalizeListParams(params)),
    fileName: `${t('示例列表')}.xlsx`,
    buttonKey: 'export',
}))

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'add',
        text: t('新增'),
        type: 'primary',
        onClick: () => handleOpenCreate(),
    },
])

const handleRefresh = async (): Promise<void> => {
    await tableRef.value?.refresh()
}

const handleOpenCreate = (): void => {
    activeRecord.value = null
    formModalVisible.value = true
}

const handleOpenEdit = (record: ExampleItem): void => {
    activeRecord.value = record
    formModalVisible.value = true
}

const handleCloseFormModal = (): void => {
    formModalVisible.value = false
    activeRecord.value = null
}

const handleDelete = (record: ExampleItem): void => {
    confirmAndRun({
        content: `${t('是否确认执行该操作？')}（${record.name || '--'}）`,
        onOk: async () => {
            await exampleApi.deleteItem({ id: record.id })
            Message.success(t('操作成功'))
            await handleRefresh()
        },
    })
}

// 左侧菜单点击时刷新；顶部页签切换带 #no-refresh 时，useOnActivated 内部会跳过。
useOnActivated(() => tableRef.value?.refresh())
</script>

<template>
    <TableSearchWrap
        ref="tableRef"
        :api-fetch="apiFetch"
        :table-columns="columns"
        :search-conf="searchConf"
        :export-config="exportConfig"
        :toolbar-buttons="toolbarButtons"
        row-key="id"
    />

    <ExampleFormModal
        v-if="formModalVisible"
        :visible="formModalVisible"
        :active-record="activeRecord"
        @close="handleCloseFormModal"
        @success="handleRefresh"
    />
</template>
