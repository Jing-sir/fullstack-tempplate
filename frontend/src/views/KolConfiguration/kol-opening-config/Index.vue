<template>
    <!--
        KOL开卡配置列表：
        - 搜索：合伙人用户UID（input）
        - 工具栏：新增按钮（权限 agentCardOpeningConfiguration:add）
        - 操作列：编辑（权限 agentCardOpeningConfiguration:edit）
    -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
        :toolbar-buttons="toolbarButtons"
    />

    <OpenConfigFormDrawer
        v-if="modalVisible"
        :visible="modalVisible"
        :type="modalType"
        :active-data="activeRecord"
        @update:visible="modalVisible = $event"
        @close="modalVisible = false"
        @success="handleRefresh"
    />
</template>

<script lang="ts" setup>
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { useOnActivated } from '@/use/useOnActivated'
import { buildTableFetchResult } from '@/utils/table'
import kolApi from '@/api/kolConfiguration/index'
import type { OpenConfigItem } from '@/api/kolConfiguration/index'
import OpenConfigFormDrawer from './drawer/OpenConfigFormModal.vue'

const { t } = useI18n()
const tableRef = ref<TableSearchWrapExpose | null>(null)

const modalVisible = ref(false)
const modalType = ref<'add' | 'edit'>('add')
const activeRecord = ref<Partial<OpenConfigItem>>({})

const handleOpen = (type: 'add' | 'edit', record?: OpenConfigItem) => {
    modalType.value = type
    activeRecord.value = record ?? {}
    modalVisible.value = true
}

const handleRefresh = () => tableRef.value?.refresh()

const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('合伙人用户UID'),
        modelKey: 'agentAccountId',
        type: 'input',
        placeholder: t('请输入'),
    },
])

const columns = computed<ColumnType[]>(() => [
    { title: t('合伙人用户UID'), dataIndex: 'agentAccountId' },
    { title: t('卡费范围'), dataIndex: 'rebateRangeName' },
    { title: t('卡类型'), dataIndex: 'cardType' },
    { title: t('渠道名称'), dataIndex: 'ditchName' },
    { title: t('用户'), dataIndex: 'email' },
    { title: t('开卡费'), dataIndex: 'openFee' },
    { title: t('创建时间'), dataIndex: 'createTime', sortable: { sorter: true } },
    { title: t('修改时间'), dataIndex: 'updateTime', sortable: { sorter: true } },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    // 权限：后端配置 agentCardOpeningConfiguration-edit
                    buttonKey: 'edit',
                    text: t('编辑'),
                    type: 'text',
                    size: 'small',
                    onClick: (record) => handleOpen('edit', record as unknown as OpenConfigItem),
                },
            ],
        },
    },
])

const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await kolApi.fetchgetOpenConfigList(params as any)
    return buildTableFetchResult({ response: res, params: params ?? {} })
}

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        // 权限：后端配置 agentCardOpeningConfiguration-add
        buttonKey: 'add',
        text: t('新增'),
        type: 'primary',
        onClick: () => handleOpen('add'),
    },
])

useOnActivated(() => tableRef.value?.refresh())
</script>
