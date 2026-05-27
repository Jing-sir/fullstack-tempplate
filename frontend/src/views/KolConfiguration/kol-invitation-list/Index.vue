<template>
    <!--
        KOL申请列表：
        - 搜索：邮箱（input）+ 阶梯费率（select：全部/Level 1/Level 2/Level 3/Other）
        - 支持导出（权限 invitationList:export）
    -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
        :export-config="exportConfig"
    />
</template>

<script lang="ts" setup>
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { useOnActivated } from '@/use/useOnActivated'
import { buildTableFetchResult } from '@/utils/table'
import kolApi from '@/api/kolConfiguration/index'

const { t } = useI18n()
const tableRef = ref<TableSearchWrapExpose | null>(null)

const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('邮箱'),
        modelKey: 'email',
        type: 'input',
        placeholder: t('请输入'),
    },
    {
        label: t('阶梯费率'),
        modelKey: 'grade',
        type: 'select',
        // 组件自动补"全部"，此处不手动前置
        options: [
            { label: 'Level 1', value: 1 },
            { label: 'Level 2', value: 2 },
            { label: 'Level 3', value: 3 },
            { label: 'Other', value: 4 },
        ],
    },
])

const columns = computed<ColumnType[]>(() => [
    { title: 'ID', dataIndex: 'id', fixed: 'left' },
    { title: t('邮箱'), dataIndex: 'email' },
    { title: t('阶梯费率'), dataIndex: 'gradeName' },
    { title: t('等级其他'), dataIndex: 'gradeOther' },
    { title: t('社区人数'), dataIndex: 'communityNum' },
    { title: t('联系人'), dataIndex: 'contact' },
    { title: t('联系电话'), dataIndex: 'contactPhone' },
    { title: t('其它说明'), dataIndex: 'repairRemark' },
    { title: t('创建时间'), dataIndex: 'createTime', sortable: { sorter: true } },
    { title: t('修改时间'), dataIndex: 'updateTime', sortable: { sorter: true } },
])

const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await kolApi.fetchGetKOLInvitationList(params as any)
    return buildTableFetchResult({ response: res, params: params ?? {} })
}

const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: (params) => kolApi.kolApplyExport(params as any),
    fileName: `${t('KOL申请列表')}.xlsx`,
    // 权限：后端配置 invitationList-export
    buttonKey: 'export',
}))

// 侧边栏重新点击时刷新列表
useOnActivated(() => tableRef.value?.refresh())
</script>
