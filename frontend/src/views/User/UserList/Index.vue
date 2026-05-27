<script setup lang="ts">
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import accountAuthApi from '@/api/userApi/account/auth'
import accountListApi from '@/api/userApi/account/list'
import tagApi from '@/api/userApi/tag'
import { subSumStatusMap, userIdTypeMap } from '@/api/userApi/userEnum'
import type {
    ColumnType,
    SearchOption,
    SearchParams,
    TableExportConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { toCountryAlpha3Options, toTagSelectOptions } from '@/utils/selectOptions'
import { Message } from '@arco-design/web-vue'
import useConfirmAction from '@/use/useConfirmAction'
import { useOnActivated } from '@/use/useOnActivated'

const { t } = useI18n()
const route = useRoute()
const { confirmAndRun } = useConfirmAction()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

interface UserListRow extends Record<string, unknown> {
    id: string
    state: 1 | 2 | 3
    authState: 0 | 1 | 2 | 3
    authStateName?: string
    advancedAuthState: 0 | 1 | 2 | 3
    advancedAuthStateName?: string
    documentType?: number | string | null
    documentTypeName?: string
    documentTypeListing?: string
    certificateType?: number | string | null
    labelList?: Array<{ id: string; name: string; color: string }>
    labelNames?: string
}

/**
 * 兼容历史从其它列表跳转时携带 ?uid=xxx 的场景：
 * 1. 首次进入默认按 uid 预筛选
 * 2. 路由 query 变化时自动同步触发一次查询
 */
const routeUid = computed(() => String(route.query.uid || ''))
const defaultParams = computed<SearchParams>(() => ({
    accountId: routeUid.value || '',
}))

const stateOptions = computed(() => [
    { label: t('正常'), value: 1 },
    { label: t('冻结'), value: 2 },
    { label: t('已注销'), value: 3 },
])

/**
 * 标签与国家下拉来源于后端，保持和标签模块、认证模块同一数据口径。
 */
const tagOptions = ref<Array<{ label: string; value: string | number }>>([])
const countryOptions = ref<Array<{ label: string; value: string | number }>>([])

const authStatusOptions = computed(() => [
    ...Array.from(subSumStatusMap.entries())
        .filter(([value]) => typeof value === 'number')
        .map(([value, item]) => ({
            label: item.label,
            value,
        })),
])

const documentTypeOptions = computed(() => [
    ...Array.from(userIdTypeMap.entries()).map(([value, item]) => ({
        label: item.label,
        value,
    })),
])

/**
 * 用户列表筛选项：
 * - 保留现有常用搜索
 * - 补齐老页面中仍在使用的证件类型、认证状态、标签、国家、渠道客户编号等字段
 */
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('UID'),
        modelKey: 'accountId',
        placeholder: t('请输入'),
        type: 'input',
        value: routeUid.value,
    },
    {
        label: t('邮箱'),
        modelKey: 'email',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('手机号后四位'),
        modelKey: 'phone',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('渠道客户编号'),
        modelKey: 'customerNo',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('本人邀请码'),
        modelKey: 'invitationCode',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('上级邀请码'),
        modelKey: 'parentInvitationCode',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('证件类型'),
        modelKey: 'documentType',
        type: 'select',
        value: '',
        options: documentTypeOptions.value,
    },
    {
        label: t('证件颁发国家'),
        modelKey: 'country',
        type: 'select',
        value: '',
        options: countryOptions.value,
    },
    {
        label: t('用户标签'),
        modelKey: 'labelId',
        type: 'select',
        value: '',
        options: tagOptions.value,
    },
    {
        label: t('初级认证状态'),
        modelKey: 'authState',
        type: 'select',
        value: '',
        options: authStatusOptions.value,
    },
    {
        label: t('高级认证状态'),
        modelKey: 'advancedAuthState',
        type: 'select',
        value: '',
        options: authStatusOptions.value,
    },
    {
        label: t('状态'),
        modelKey: 'state',
        type: 'select',
        value: '',
        options: stateOptions.value,
    },
    {
        label: t('创建日期'),
        modelKey: ['startTime', 'endTime'],
        type: 'date',
        timeFormat: 'YYYY-MM-DD HH:mm:ss',
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    /**
     * 你要求“不是所有列都需要排序，默认仅状态/时间带排序”：
     * - 非状态/时间列统一显式关闭 sorter
     * - 状态类与时间类列显式声明 sorter，避免行为漂移
     */
    {
        title: t('UID'),
        dataIndex: 'id',
        fixed: 'left',
        width: 180,
        amountFormat: false,
        sorter: false,
        cellPreset: { type: 'copyableText' },
    },
    {
        title: t('渠道客户编号'),
        dataIndex: 'customerNo',
        width: 160,
        amountFormat: false,
        sorter: false,
        cellPreset: { type: 'copyableText' },
    },
    { title: t('所属代理商'), dataIndex: 'agentName', width: 180, sorter: false },
    { title: t('用户类型'), dataIndex: 'userTypeName', width: 110, sorter: false },
    {
        title: t('本人邀请码'),
        dataIndex: 'invitationCode',
        width: 140,
        sorter: false,
        cellPreset: { type: 'copyableText' },
    },
    {
        title: t('上级邀请码'),
        dataIndex: 'parentInvitationCode',
        width: 140,
        sorter: false,
        cellPreset: { type: 'copyableText' },
    },
    { title: t('姓'), dataIndex: 'surname', width: 120, sorter: false },
    { title: t('名'), dataIndex: 'name', width: 120, sorter: false },
    {
        title: t('标签'),
        dataIndex: 'labelList',
        width: 120,
        sorter: false,
        cellPreset: {
            type: 'labelTags',
            labelListField: 'labelList',
            labelNamesField: 'labelNames',
        },
    },
    { title: t('证件颁发国家'), dataIndex: 'country', width: 140, sorter: false },
    {
        title: t('初级认证状态'),
        dataIndex: 'authState',
        width: 130,
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            valueFields: ['authStateName', 'authState'],
            showRawWhenUnknown: true,
        },
        sorter: {
            type: 'enum',
            enumOrder: [0, 1, 2, 3],
        },
    },
    {
        title: t('高级认证状态'),
        dataIndex: 'advancedAuthState',
        width: 140,
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            valueFields: ['advancedAuthStateName', 'advancedAuthState'],
            showRawWhenUnknown: true,
        },
        sorter: {
            type: 'enum',
            enumOrder: [0, 1, 2, 3],
        },
    },
    {
        title: t('证件类型'),
        dataIndex: 'documentType',
        slotName: 'documentType',
        width: 120,
        sorter: false,
    },
    { title: t('邮箱'), dataIndex: 'email', width: 180, sorter: false },
    { title: t('区号'), dataIndex: 'globalCode', width: 80, sorter: false },
    { title: t('手机号'), dataIndex: 'phone', width: 150, sorter: false },
    {
        title: t('创建日期'),
        dataIndex: 'createTime',
        width: 180,
        sorter: {
            type: 'date',
        },
    },
    {
        title: t('状态'),
        dataIndex: 'state',
        fixed: 'right',
        width: 90,
        cellPreset: {
            type: 'statusText',
            preset: 'userState',
        },
        sorter: {
            type: 'enum',
            enumOrder: [1, 2, 3],
        },
    },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        width: 200,
        sorter: false,
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'disable',
                    status: (record) =>
                        Number(record.state) === 1 ? 'danger' : 'normal',
                    text: (record) =>
                        Number(record.state) === 1 ? t('禁用') : t('启用'),
                    onClick: (record) => handleToggleState(record as UserListRow),
                },
                {
                    buttonKey: 'reset',
                    text: t('重置登录密码'),
                    onClick: (record) => handleResetPassword(record as UserListRow),
                },
                {
                    buttonKey: 'resetFund',
                    text: t('重置资金密码'),
                    onClick: (record) => handleResetPayPassword(record as UserListRow),
                },
            ],
        },
    },
])

const fetchUserList = (params: Record<string, unknown> = {}) =>
    accountListApi.getAccountList(params as Parameters<typeof accountListApi.getAccountList>[0])

const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: (params: Record<string, unknown>) =>
        accountListApi.exportAccountList(params as Parameters<typeof accountListApi.exportAccountList>[0]),
    fileName: `${t('用户列表')}.xlsx`,
}))

/**
 * 证件类型字段在不同接口版本里可能是：
 * - documentType: 1/2 或 "1"/"2"
 * - documentTypeName / documentTypeListing: 已翻译字符串
 * - "1,2" 这种逗号分隔值
 *
 * 这里统一做兼容，避免 /user/userList 出现“证件状态/证件类型不显示”。
 */
const formatDocumentTypeText = (value: unknown): string | null => {
    if (value === null || value === '' || typeof value === 'undefined') {
        return null
    }

    if (Array.isArray(value)) {
        const textList = value
            .map((item) => formatDocumentTypeText(item))
            .filter((item): item is string => Boolean(item))
        return textList.length ? textList.join(' / ') : null
    }

    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return null

        if (trimmed.includes(',')) {
            const textList = trimmed
                .split(',')
                .map((item) => formatDocumentTypeText(item.trim()))
                .filter((item): item is string => Boolean(item))
            return textList.length ? textList.join(' / ') : null
        }

        if (!Number.isNaN(Number(trimmed))) {
            const mappedLabel = userIdTypeMap.get(Number(trimmed))?.label
            return mappedLabel || trimmed
        }

        return trimmed
    }

    if (typeof value === 'number') {
        const mappedLabel = userIdTypeMap.get(value)?.label
        return mappedLabel || String(value)
    }

    return String(value)
}

const formatDocumentType = (record: UserListRow): string => {
    const candidateValues = [
        record.documentTypeName,
        record.documentTypeListing,
        record.documentType,
        record.certificateType,
    ]

    for (const candidateValue of candidateValues) {
        const mappedText = formatDocumentTypeText(candidateValue)
        if (mappedText) return mappedText
    }

    return '--'
}

const handleToggleState = (record: UserListRow): void => {
    const nextState = record.state === 1 ? 2 : 1
    const actionText = nextState === 1 ? t('启用') : t('禁用')

    confirmAndRun({
        content: t('是否确认执行该操作？') + `（${actionText}）`,
        onOk: async () => {
            await accountListApi.updateAccountState({ id: String(record.id), state: nextState as 1 | 2 })
            Message.success(t('操作成功'))
            await tableWrapRef.value?.refresh()
        },
    })
}

const handleResetPassword = (record: UserListRow): void => {
    confirmAndRun({
        content: t('是否确认执行该操作？') + `（${t('重置登录密码')}）`,
        onOk: async () => {
            await accountListApi.resetAccountPassword({ id: String(record.id) })
            Message.success(t('操作成功'))
            await tableWrapRef.value?.refresh()
        },
    })
}

const handleResetPayPassword = (record: UserListRow): void => {
    confirmAndRun({
        content: t('是否确认执行该操作？') + `（${t('重置资金密码')}）`,
        onOk: async () => {
            await accountListApi.resetAccountPayPassword({ id: String(record.id) })
            Message.success(t('操作成功'))
            await tableWrapRef.value?.refresh()
        },
    })
}

/**
 * 统一拉取用户列表筛选下拉：
 * - 标签：复用标签模块接口
 * - 国家：复用认证模块国家配置
 */
const querySearchOptions = async (): Promise<void> => {
    const [tagList, countryList] = await Promise.all([
        tagApi.getTagList(),
        accountAuthApi.getUapyCountryList(),
    ])

    tagOptions.value = toTagSelectOptions(tagList)
    countryOptions.value = toCountryAlpha3Options(countryList)
}

watch(
    () => routeUid.value,
    (nextUid, prevUid) => {
        if (nextUid === prevUid || !tableWrapRef.value) {
            return
        }

        tableWrapRef.value
            .search({
                ...tableWrapRef.value.getSearchParams(),
                accountId: nextUid || null,
            })
            .catch(() => undefined)
    },
)

onMounted(() => {
    querySearchOptions().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
})

useOnActivated(() => {
    tableWrapRef.value?.refresh()
    querySearchOptions().catch(() => undefined)
})
</script>

<template>
    <TableSearchWrap
        ref="tableWrapRef"
        :api-fetch="fetchUserList"
        :table-columns="tableColumns"
        :search-conf="searchConf"
        :default-params="defaultParams"
        :export-config="exportConfig"
        row-key="id"
    >
        <template #documentType="{ record }">
            {{ formatDocumentType(record as UserListRow) }}
        </template>
    </TableSearchWrap>
</template>
