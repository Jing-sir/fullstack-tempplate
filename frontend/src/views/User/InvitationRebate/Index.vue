<script setup lang="ts">
import referralApi from '@/api/userApi/referral'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'

interface InvitationRebateRow extends Record<string, unknown> {
    id: string
    cardDepositOrderNo: string
    depositAmount: string
    depositType: string | number
    ditchName?: string
    ditchId?: string
    earningAmount: string
    rebateRatio: string
    invitationCode: string
    inviteAccountId: string
    accountCardNo?: string
    parentAccountId: string
    createTime: string
}

const { t } = useI18n()
const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

const getDepositTypeLabel = (depositType: number): string => {
    if (depositType === 1) return t('开卡')
    if (depositType === 2) return t('充值')
    if (depositType === 3) return t('开卡减免')
    if (depositType === 4) return t('首次开卡减免')
    return '--'
}

/**
 * 邀请返佣查询条件：
 * - 与老项目保持同一组筛选字段
 * - 保留“类型”下拉（开卡/充值/减免）查询能力
 */
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('UID'),
        modelKey: 'inviteAccountId',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('上级邀请码'),
        modelKey: 'invitationCode',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('关联订单号'),
        modelKey: 'cardDepositOrderNo',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('上级 ID'),
        modelKey: 'parentAccountId',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('类型'),
        modelKey: 'depositType',
        type: 'select',
        value: null,
        options: [
            { label: t('开卡'), value: 1 },
            { label: t('充值'), value: 2 },
            { label: t('开卡减免'), value: 3 },
            { label: t('首次开卡减免'), value: 4 },
        ],
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id', fixed: 'left', sorter: false },
    { title: t('关联订单号'), dataIndex: 'cardDepositOrderNo', sorter: false },
    { title: t('充值数量'), dataIndex: 'depositAmount', sorter: false },
    { title: t('类型'), dataIndex: 'depositType', slotName: 'depositType', sorter: false },
    { title: t('渠道名称'), dataIndex: 'ditchName', sorter: false },
    { title: t('渠道ID'), dataIndex: 'ditchId', sorter: false },
    { title: t('返佣/减免数量'), dataIndex: 'earningAmount', sorter: false },
    {
        title: t('返佣比例'),
        dataIndex: 'rebateRatio',
        sorter: false,
        cellPreset: {
            type: 'percentText',
        },
    },
    { title: t('上级邀请码'), dataIndex: 'invitationCode', sorter: false },
    { title: t('UID'), dataIndex: 'inviteAccountId', sorter: false },
    { title: t('UID卡号'), dataIndex: 'accountCardNo', sorter: false },
    { title: t('上级 ID'), dataIndex: 'parentAccountId', sorter: false },
    { title: t('返佣时间'), dataIndex: 'createTime', fixed: 'right', sorter: false },
])

/**
 * 列表查询参数统一归一：
 * 1. pageNo/pageSize 必传且保持数字
 * 2. 输入型筛选字段保持字符串口径
 * 3. select 空值保持 null（后端“全部”语义）
 */
const normalizeReferralQueryParams = (params: Record<string, unknown> = {}) => ({
    inviteAccountId: String(params.inviteAccountId || ''),
    parentAccountId: String(params.parentAccountId || ''),
    invitationCode: String(params.invitationCode || ''),
    cardDepositOrderNo: String(params.cardDepositOrderNo || ''),
    depositType:
        params.depositType === '' || params.depositType === null || typeof params.depositType === 'undefined'
            ? null
            : params.depositType,
    pageNo: Number(params.pageNo || 1),
    pageSize: Number(params.pageSize || 20),
})

const fetchReferralList = (params: Record<string, unknown> = {}) =>
    referralApi.getReferralList(
        normalizeReferralQueryParams(
            params,
        ) as Parameters<typeof referralApi.getReferralList>[0],
    )

/**
 * 导出保持老页面行为：
 * 1. 沿用当前筛选条件
 * 2. 带上当前分页参数
 * 3. 导出文件名固定为“邀请返佣.xlsx”
 */
const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: (params: Record<string, unknown>) =>
        referralApi.exportReferralList(
            normalizeReferralQueryParams(
                params,
            ) as Parameters<typeof referralApi.exportReferralList>[0],
        ),
    fileName: `${t('邀请返佣')}.xlsx`,
}))

const formatDepositType = (record: InvitationRebateRow): string => {
    const rawType = Number(record.depositType)
    return getDepositTypeLabel(rawType)
}

/**
 * 兼容 keep-alive 的历史行为：
 * - hash 为 #no-refresh 时不刷新
 * - 其余场景激活后重置筛选并重新拉取
 */
useOnActivated(() => {
    tableWrapRef.value?.reset()
})
</script>

<template>
    <TableSearchWrap
        ref="tableWrapRef"
        :api-fetch="fetchReferralList"
        :table-columns="tableColumns"
        :search-conf="searchConf"
        :export-config="exportConfig"
        row-key="id"
    >
        <template #depositType="{ record }">
            {{ formatDepositType(record as InvitationRebateRow) }}
        </template>
    </TableSearchWrap>
</template>
