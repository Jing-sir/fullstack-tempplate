<script setup lang="ts">
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import EditWhiteListDrawer from './drawer/EditWhiteListDrawer.vue'
import { transMapBySelectOptions } from '@/utils/component'
import { buildTableFetchResult } from '@/utils/table'
import useConfirmAction from '@/use/useConfirmAction'
import { useOnActivated } from '@/use/useOnActivated'
import type { WhitelistRow } from '@/api/whiteList'
import { Message } from '@arco-design/web-vue'
import whiteListApi from '@/api/whiteList'
import {
    commonLevelEnumMap,
    whitelistStateEnum,
    whitelistStateEnumMap,
} from '@/enums/whitelistEnum'
import type {
    ColumnType,
    SearchOption,
    TableFetchResult,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'

interface WhitelistTableRow extends WhitelistRow, Record<string, unknown> {
    stateLoading?: boolean
    ditchCardIds?: string
}

interface EditWhiteListDrawerExpose {
    open: (source?: WhitelistTableRow) => void
    close: () => void
}

const { t } = useI18n()
const { confirmAndRun } = useConfirmAction()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)
const editModalRef = ref<EditWhiteListDrawerExpose | null>(null)

const levelOptions = computed(() => [
    ...transMapBySelectOptions(commonLevelEnumMap, (value, item) => ({
        label: item.label,
        value: value as number,
    })),
])

const stateOptions = computed(() => [
    ...transMapBySelectOptions(whitelistStateEnumMap, (value, item) => ({
        label: item.label,
        value: value as number,
    })),
])

const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('UID'),
        modelKey: 'accountId',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('赦免认证等级'),
        modelKey: 'kycLevelRequired',
        type: 'select',
        value: '',
        options: levelOptions.value,
    },
    {
        label: t('模拟认证等级'),
        modelKey: 'kycLevelMock',
        type: 'select',
        value: '',
        options: levelOptions.value,
    },
    {
        label: t('状态'),
        modelKey: 'state',
        type: 'select',
        value: '',
        options: stateOptions.value,
    },
])

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'userWhiteListAdd',
        text: t('新增'),
        type: 'primary',
        size: 'mini',
        onClick: () => {
            editModalRef.value?.open()
        },
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('UID'), dataIndex: 'accountId', fixed: 'left' },
    {
        title: t('标签'),
        dataIndex: 'labelList',
        cellPreset: {
            type: 'labelTags',
            labelListField: 'labelList',
            labelNamesField: 'labelNames',
        },
    },
    { title: t('业务类型'), dataIndex: 'businessType', slotName: 'businessType' },
    {
        title: t('赦免认证等级'),
        dataIndex: 'kycLevelRequired',
        cellPreset: {
            type: 'statusText',
            preset: 'whitelistLevel',
        },
    },
    {
        title: t('实际认证等级'),
        dataIndex: 'kycLevel',
        cellPreset: {
            type: 'statusText',
            preset: 'whitelistLevel',
        },
    },
    {
        title: t('模拟认证等级'),
        dataIndex: 'kycLevelMock',
        cellPreset: {
            type: 'statusText',
            preset: 'whitelistLevel',
        },
    },
    {
        title: t('状态'),
        dataIndex: 'state',
        cellPreset: {
            type: 'statusText',
            preset: 'whitelistState',
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
                    buttonKey: 'userWhiteListUpdateState',
                    size: 'mini',
                    loadingField: 'stateLoading',
                    text: (record) =>
                        Number(record.state) === whitelistStateEnum.Disable ? t('启用') : t('禁用'),
                    onClick: (record) => handleSetState(record as WhitelistTableRow),
                },
                {
                    buttonKey: 'userListEditLabel',
                    size: 'mini',
                    text: t('编辑'),
                    onClick: (record) => {
                        editModalRef.value?.open(record as WhitelistTableRow)
                    },
                },
            ],
        },
    },
])

const fetchWhitelistList = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<Record<string, unknown>>> => {
    const response = await whiteListApi.fetchWhitelistList(params)
    return buildTableFetchResult<Record<string, unknown>>({
        response,
        params,
    })
}

const handleEditSuccess = async (): Promise<void> => {
    await tableWrapRef.value?.refresh()
}

/**
 * 白名单状态切换需要确认，避免误触导致用户策略即时生效。
 */
const handleSetState = (record: WhitelistTableRow): void => {
    const nextState =
        Number(record.state) === whitelistStateEnum.Disable
            ? whitelistStateEnum.Enable
            : whitelistStateEnum.Disable

    confirmAndRun({
        title: t('确认'),
        content: `${t('是否确认执行该操作？')}（${nextState === whitelistStateEnum.Enable ? t('启用') : t('禁用')}）`,
        onOk: async () => {
            record.stateLoading = true
            whiteListApi.fetchUpdateState({
                id: record.id,
                state: nextState,
            })
                .then(async () => {
                    Message.success(t('操作成功'))
                    await tableWrapRef.value?.refresh()
                })
                .finally(() => {
                    record.stateLoading = false
                })
        },
    })
}

/**
 * 业务类型字段历史上由逗号字符串承载，模板层统一先拆分清洗再渲染，避免内联表达式过长。
 */
const getBusinessTypeList = (businessType: unknown): string[] =>
    String(businessType || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

useOnActivated(() => tableWrapRef.value?.refresh())
</script>

<template>
    <div>
        <TableSearchWrap
            ref="tableWrapRef"
            :api-fetch="fetchWhitelistList"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :toolbar-buttons="toolbarButtons"
            :enable-column-sort="false"
            row-key="id"
        >
            <template #businessType="{ record }">
                <ul class="space-y-1 pl-0">
                    <li
                        v-for="bus in getBusinessTypeList(record.businessType)"
                        :key="bus"
                        class="list-none"
                    >
                        {{ bus }}
                    </li>
                    <li v-if="!record.businessType" class="list-none">--</li>
                </ul>
            </template>
        </TableSearchWrap>

        <EditWhiteListDrawer ref="editModalRef" @success="handleEditSuccess" />
    </div>
</template>
