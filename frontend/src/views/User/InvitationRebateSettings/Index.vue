<script setup lang="ts">
import referralApi from '@/api/userApi/referral'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type {
    ColumnType,
    SearchOption,
    TableSearchWrapExpose,
    TableToolbarButtonConfig,
} from '@/interface/TableType'
import SettingsDrawer from './drawer/SettingsDrawer.vue'

interface ReferralConfigRow extends Record<string, unknown> {
    id: string
    accountId: string
    rangeType: string | number
    scale: string | number
    scaleType: string | number
    createTime: string
}

const { t } = useI18n()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

const modalVisible = ref(false)
const modalType = ref<'add' | 'edit'>('add')
const activeData = ref<ReferralConfigRow | null>(null)

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'add',
        text: t('添加'),
        type: 'primary',
        onClick: () => {
            modalType.value = 'add'
            activeData.value = null
            modalVisible.value = true
        },
    },
])

/**
 * 返佣配置筛选项与老页面保持一致：
 * - 账号UID
 * - 范围类型（全局/用户）
 * - 返佣类型（开卡/充值/开卡减免）
 */
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('账号UID'),
        modelKey: 'accountId',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('范围类型'),
        modelKey: 'rangeType',
        type: 'select',
        value: null,
        options: [
            { label: t('全局'), value: 1 },
            { label: t('用户'), value: 2 },
        ],
    },
    {
        label: t('返佣类型'),
        modelKey: 'scaleType',
        type: 'select',
        value: null,
        options: [
            { label: t('开卡'), value: 1 },
            { label: t('充值'), value: 2 },
            { label: t('开卡减免'), value: 3 },
        ],
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id', fixed: 'left', sorter: false },
    { title: t('账号UID'), dataIndex: 'accountId', sorter: false },
    { title: t('范围类型'), dataIndex: 'rangeType', slotName: 'rangeType', sorter: false },
    { title: t('返佣比例'), dataIndex: 'scale', slotName: 'scale', sorter: false },
    { title: t('返佣类型'), dataIndex: 'scaleType', slotName: 'scaleType', sorter: false },
    { title: t('返佣时间'), dataIndex: 'createTime', sorter: false },
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
                    text: t('修改'),
                    onClick: (record) => {
                        modalType.value = 'edit'
                        activeData.value = { ...(record as ReferralConfigRow) }
                        modalVisible.value = true
                    },
                },
            ],
        },
    },
])

/**
 * 接口查询参数归一：
 * - 空值统一转 null，保持“不过滤”语义
 * - 保证 pageNo/pageSize 始终是数字
 */
const normalizeConfigQueryParams = (params: Record<string, unknown> = {}) => ({
    scaleType:
        params.scaleType === '' || params.scaleType === null || typeof params.scaleType === 'undefined'
            ? null
            : String(params.scaleType),
    rangeType:
        params.rangeType === '' || params.rangeType === null || typeof params.rangeType === 'undefined'
            ? null
            : String(params.rangeType),
    accountId: String(params.accountId || ''),
    pageNo: Number(params.pageNo || 1),
    pageSize: Number(params.pageSize || 20),
})

const fetchReferralConfigList = (params: Record<string, unknown> = {}) =>
    referralApi.getReferralConfigList(
        normalizeConfigQueryParams(
            params,
        ) as Parameters<typeof referralApi.getReferralConfigList>[0],
    )

const formatRangeType = (record: ReferralConfigRow): string => {
    const rawValue = Number(record.rangeType)
    if (rawValue === 1) return t('全局')
    if (rawValue === 2) return t('用户')
    return '--'
}

const formatScaleType = (record: ReferralConfigRow): string => {
    const rawValue = Number(record.scaleType)
    if (rawValue === 1) return t('开卡')
    if (rawValue === 2) return t('充值')
    if (rawValue === 3) return t('开卡减免')
    return '--'
}

const formatScale = (record: ReferralConfigRow): string => {
    const scaleText = String(record.scale ?? '')
    if (Number(record.scaleType) === 1) {
        return scaleText
    }

    return `${scaleText}%`
}

const handleModalClose = (): void => {
    modalVisible.value = false
}

const handleModalSuccess = async (): Promise<void> => {
    await tableWrapRef.value?.refresh()
}

/**
 * 与老页面激活刷新逻辑保持一致：
 * 进入页面或 keep-alive 激活后重置筛选并重新查询。
 */
useOnActivated(() => {
    tableWrapRef.value?.reset()
})
</script>

<template>
    <div>
        <TableSearchWrap
            ref="tableWrapRef"
            :api-fetch="fetchReferralConfigList"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :toolbar-buttons="toolbarButtons"
            row-key="id"
        >
            <template #rangeType="{ record }">
                {{ formatRangeType(record as ReferralConfigRow) }}
            </template>

            <template #scaleType="{ record }">
                {{ formatScaleType(record as ReferralConfigRow) }}
            </template>

            <template #scale="{ record }">
                {{ formatScale(record as ReferralConfigRow) }}
            </template>
        </TableSearchWrap>

        <SettingsDrawer
            :visible="modalVisible"
            :type="modalType"
            :active-data="activeData"
            @update:visible="modalVisible = $event"
            @close="handleModalClose"
            @success="handleModalSuccess"
        />
    </div>
</template>
