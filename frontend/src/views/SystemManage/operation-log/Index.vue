<script setup lang="ts">
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableSearchSorterConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import sysOperationLogApi from '@/api/sys/operationLog'

const { t } = useI18n()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

// 使用 computed 而非 ref，确保语言切换时 label/placeholder 响应式更新。
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('操作人'),
        modelKey: 'opAccount',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('请求功能'),
        modelKey: 'reqFunc',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('操作时间'),
        modelKey: ['startTime', 'endTime'],
        sortField: 'opTime',
        sortType: 'date',
        type: 'date',
        value: [],
    },
])

const searchSorter: TableSearchSorterConfig = {
    enabled: true,
}

const tableColumns = computed<ColumnType[]>(() => [
    {
        title: t('ID'),
        dataIndex: 'id',
        fixed: 'left',
        sorter: {
            type: 'number',
        },
    },
    { title: t('操作人'), dataIndex: 'opAccount', sorter: false },
    {
        title: t('操作时间'),
        dataIndex: 'opTime',
        sorter: {
            type: 'date',
        },
    },
    { title: t('IP'), dataIndex: 'ip', sorter: false },
    { title: t('请求功能'), dataIndex: 'reqFunc', sorter: false },
    { title: t('请求URL'), dataIndex: 'reqUrl', sorter: false },
    { title: t('请求报文'), dataIndex: 'reqData', slotName: 'reqData', sorter: false },
    { title: t('响应报文'), dataIndex: 'respData', slotName: 'respData', sorter: false },
    { title: t('请求方式'), dataIndex: 'reqMethod', sorter: false },
    {
        title: t('执行耗时(毫秒)'),
        dataIndex: 'elapsedTime',
        sorter: {
            type: 'number',
        },
    },
    {
        title: t('是否发生错误的表示'),
        dataIndex: 'occurErr',
        cellPreset: {
            type: 'statusText',
            preset: 'boolean',
        },
        sorter: {
            type: 'enum',
            enumOrder: [true, 1, false, 0],
        },
    },
    { title: t('发生错误的信息'), dataIndex: 'errMsg', slotName: 'errMsg', sorter: false },
    {
        title: t('响应状态'),
        dataIndex: 'success',
        fixed: 'right',
        cellPreset: {
            type: 'statusText',
            preset: 'success',
        },
        sorter: {
            type: 'enum',
            enumOrder: [true, 1, false, 0],
        },
    },
])

const fetchOperationLogList = (params: Record<string, unknown> = {}) =>
    sysOperationLogApi.fetchOperationLogList(
        params as Parameters<typeof sysOperationLogApi.fetchOperationLogList>[0],
    )

/**
 * 请求/响应报文优先按 JSON 格式化，方便排查接口问题。
 * 如果后端返回的不是合法 JSON，则保留原始文本，避免渲染报错。
 */
const getJsonText = (value: unknown): string => {
    if (value === null || value === '' || typeof value === 'undefined') return '--'
    const rawText = String(value)

    try {
        return JSON.stringify(JSON.parse(rawText), null, 2)
    } catch {
        return rawText
    }
}

useOnActivated(() => {
    tableWrapRef.value?.refresh()
})
</script>

<template>
    <TableSearchWrap
        ref="tableWrapRef"
        :api-fetch="fetchOperationLogList"
        :table-columns="tableColumns"
        :search-conf="searchConf"
        :search-sorter="searchSorter"
        row-key="id"
    >
        <template #reqData="{ record }">
            <a-popover position="top" trigger="click">
                <template #content>
                    <pre class="max-h-[400px] min-h-[300px] overflow-auto whitespace-pre-wrap break-all">{{ getJsonText(record.reqData) }}</pre>
                </template>
                <a-button type="text" size="small" class="!px-0">{{ t('详细') }}</a-button>
            </a-popover>
        </template>

        <template #respData="{ record }">
            <a-popover position="top" trigger="click">
                <template #content>
                    <pre class="max-h-[400px] min-h-[300px] overflow-auto whitespace-pre-wrap break-all">{{ getJsonText(record.respData) }}</pre>
                </template>
                <a-button type="text" size="small" class="!px-0">{{ t('详细') }}</a-button>
            </a-popover>
        </template>

        <template #errMsg="{ record }">
            <a-popover v-if="record.errMsg" position="top" trigger="click">
                <template #content>
                    <div class="h-[400px] w-[400px] overflow-y-auto break-all px-5">
                        {{ record.errMsg }}
                    </div>
                </template>
                <a-button type="text" size="small" class="!px-0">{{ t('详细') }}</a-button>
            </a-popover>
            <span v-else>--</span>
        </template>
    </TableSearchWrap>
</template>
