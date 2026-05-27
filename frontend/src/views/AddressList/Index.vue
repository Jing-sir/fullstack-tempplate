<script setup lang="ts">
import shippingInformationApi, {
    type ShippingInformationListParams,
} from '@/api/userApi/shippingInformation'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableFetchResult,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { buildTableFetchResult } from '@/utils/table'
import { useOnActivated } from '@/use/useOnActivated'

const { t } = useI18n()

/**
 * 地址列表搜索项。
 * 这里保持和老项目同一批筛选字段：ID、UID、全称。
 */
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('ID'),
        modelKey: 'id',
        type: 'input',
        value: '',
    },
    {
        label: t('UID'),
        modelKey: 'accountId',
        type: 'input',
        value: '',
    },
    {
        label: t('全称'),
        modelKey: 'fullName',
        type: 'input',
        value: '',
    },
])

/**
 * 地址列表列定义。
 * 迁移时按老项目字段顺序保留，避免运营同学阅读表格时产生认知偏差。
 */
const tableColumns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id', fixed: 'left' },
    { title: t('UID'), dataIndex: 'accountId' },
    { title: t('客户编号'), dataIndex: 'customerNo' },
    { title: t('全称'), dataIndex: 'fullName' },
    { title: t('国家'), dataIndex: 'country' },
    { title: t('省份/州'), dataIndex: 'province' },
    { title: t('城市'), dataIndex: 'city' },
    { title: t('详细地址'), dataIndex: 'addressLine1' },
    { title: t('邮箱'), dataIndex: 'email' },
    { title: t('手机'), dataIndex: 'phone' },
    { title: t('电话区号'), dataIndex: 'phoneArea' },
    { title: t('邮编'), dataIndex: 'postCode' },
])

/**
 * 统一收敛地址列表接口参数：
 * 1. 空值保持为空字符串，兼容老接口的参数判空分支
 * 2. 分页字段提供默认值，避免导出和列表请求参数口径不一致
 */
const normalizeAddressListParams = (
    params: Record<string, unknown> = {},
): ShippingInformationListParams => ({
    id: String(params.id || ''),
    accountId: String(params.accountId || ''),
    fullName: String(params.fullName || ''),
    pageNo: Number(params.pageNo || 1),
    pageSize: Number(params.pageSize || 20),
})

/**
 * 列表请求：返回 TableSearchWrap 统一结构。
 */
const fetchAddressList = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<Record<string, unknown>>> => {
    const normalizedParams = normalizeAddressListParams(params)
    const response = await shippingInformationApi.getShippingInformationList(normalizedParams)

    return buildTableFetchResult<Record<string, unknown>>({
        response,
        params: normalizedParams,
    })
}

const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) =>
        shippingInformationApi.exportShippingInformationList(
            normalizeAddressListParams(params),
        ),
    fileName: `${t('地址列表')}.xlsx`,
}))

const tableRef = ref<TableSearchWrapExpose | null>(null)
useOnActivated(() => tableRef.value?.refresh())

</script>

<template>
    <TableSearchWrap
        ref="tableRef"
        :api-fetch="fetchAddressList"
        :table-columns="tableColumns"
        :search-conf="searchConf"
        :export-config="exportConfig"
        :enable-column-sort="false"
        row-key="id"
    />
</template>
