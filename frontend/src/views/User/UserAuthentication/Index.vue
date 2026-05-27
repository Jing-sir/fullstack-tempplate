<script setup lang="ts">
import accountAuthApi from '@/api/userApi/account/auth'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type { ColumnType, SearchOption, TableFetchResult, TableSearchWrapExpose } from '@/interface/TableType'
import { buildTableFetchResult } from '@/utils/table'
import { toCountryAlpha3Options } from '@/utils/selectOptions'
import { Message } from '@arco-design/web-vue'
import { userIdTypeMap } from '@/api/userApi/userEnum'
import useConfirmAction from '@/use/useConfirmAction'
import { useOnActivated } from '@/use/useOnActivated'

const { t } = useI18n()
const router = useRouter()
const { confirmAndRun } = useConfirmAction()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

/**
 * 认证等级开关：平台级配置，值为 0(初级认证) / 1(高级认证)。
 * 用字符串承接，兼容后端可能返回 string/number 的情况。
 */
const currentLevel = ref('0')
const levelSaving = ref(false)

/**
 * 国家下拉数据来自后端配置中心。
 * 这里统一转成 SearchWrap 可消费的 { label, value } 结构。
 */
const countryOptions = ref<Array<{ label: string; value: string }>>([])

/**
 * 认证证件类型使用历史枚举映射，避免页面维护重复常量。
 */
const documentTypeOptions = computed(() => [
    ...Array.from(userIdTypeMap.entries()).map(([value, item]) => ({
        label: item.label,
        value: String(value),
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
        label: t('已提交认证证件'),
        modelKey: 'documentType',
        type: 'select',
        value: '',
        options: documentTypeOptions.value,
    },
    {
        label: t('证件颁发国家'),
        modelKey: 'countryCode',
        type: 'select',
        value: '',
        options: countryOptions.value,
    },
    {
        label: t('国籍'),
        modelKey: 'nationality',
        type: 'select',
        value: '',
        options: countryOptions.value,
    },
    {
        label: t('认证状态'),
        modelKey: 'authStatus',
        type: 'select',
        value: '',
        options: [
            { label: t('通过验证'), value: 'GREEN' },
            { label: t('拒绝'), value: 'RED' },
            { label: t('未认证'), value: 'WAIT' },
        ],
    },
    {
        label: t('创建日期'),
        modelKey: ['startTime', 'endTime'],
        type: 'date',
        timeFormat: 'YYYY-MM-DD HH:mm:ss',
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('UID'), dataIndex: 'accountId', fixed: 'left' },
    { title: t('性别'), dataIndex: 'sex' },
    { title: t('申请ID'), dataIndex: 'applicantId' },
    { title: t('已提交认证证件'), dataIndex: 'documentTypeListing' },
    { title: t('证件颁发国家'), dataIndex: 'countryListing' },
    { title: t('国籍'), dataIndex: 'nationalListing' },
    { title: t('护照名'), dataIndex: 'passportMing' },
    { title: t('护照中间名'), dataIndex: 'passportMiddle' },
    { title: t('护照姓'), dataIndex: 'passportXing' },
    { title: t('身份证名'), dataIndex: 'idCardMing' },
    { title: t('身份证中间名'), dataIndex: 'idCardMiddle' },
    { title: t('身份证姓'), dataIndex: 'idCardXing' },
    { title: t('驾驶证姓'), dataIndex: 'driversXing' },
    { title: t('驾驶证中间名'), dataIndex: 'driversMiddle' },
    { title: t('驾驶证名'), dataIndex: 'driversMing' },
    { title: t('居住证姓'), dataIndex: 'residenceXing' },
    { title: t('居住中间名'), dataIndex: 'residenceMiddle' },
    { title: t('居住证名'), dataIndex: 'residenceMing' },
    {
        title: t('身份证认证'),
        dataIndex: 'idCardAuthStatus',
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            showRawWhenUnknown: true,
        },
    },
    {
        title: t('护照认证'),
        dataIndex: 'passportAuthStatus',
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            showRawWhenUnknown: true,
        },
    },
    {
        title: t('驾照认证'),
        dataIndex: 'driversAuthStatus',
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            showRawWhenUnknown: true,
        },
    },
    {
        title: t('居留证认证'),
        dataIndex: 'residenceAuthStatus',
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            showRawWhenUnknown: true,
        },
    },
    {
        title: t('人脸认证'),
        dataIndex: 'faceAuthStatus',
        cellPreset: {
            type: 'statusText',
            preset: 'authState',
            showRawWhenUnknown: true,
        },
    },
    { title: t('创建日期'), dataIndex: 'createTime' },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        sorter: false,
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'userAuthenticationDetail',
                    text: t('审核详情'),
                    onClick: (record) => openAuthDetail(record),
                },
            ],
        },
    },
])

/**
 * TableSearchWrap 统一走 pageNo/pageSize。
 * 认证列表旧接口使用 pageNum，所以这里做一次参数桥接。
 */
const fetchUserAuthList = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<Record<string, unknown>>> => {
    const { pageNo, ...restParams } = params
    const response = await accountAuthApi.getUserAuthList({
        ...restParams,
        pageNum: pageNo,
    })

    return buildTableFetchResult<Record<string, unknown>>({
        response,
        params,
        pageNoKeys: ['pageNo', 'pageNum'],
    })
}

/**
 * 切换平台认证等级前先二次确认，避免误操作影响全量用户。
 */
const handleLevelChange = (value: string | number | boolean): void => {
    const nextValue = String(value)
    const nextText = nextValue === '0' ? t('初级认证') : t('高级认证')

    confirmAndRun({
        title: t('修改平台认证等级'),
        content: t('请确认是否修改平台所有用户的认证等级为“{level}”，修改后所有用户将只做“{level}”。')
            .replace('{level}', nextText),
        onOk: async () => {
            levelSaving.value = true
            accountAuthApi.setUserAuthLevel({ value: nextValue })
                .then(async () => {
                    currentLevel.value = nextValue
                    Message.success(t('操作成功'))
                    await tableWrapRef.value?.refresh()
                })
                .finally(() => {
                    levelSaving.value = false
                })
        },
    })
}

/**
 * 跳转审核详情页，复用老项目的 route name，保证权限与页签行为一致。
 */
const openAuthDetail = (record: Record<string, unknown>): void => {
    router.push({
        name: 'UserAuthDetail',
        params: { id: String(record.accountId || '') },
    })
}

const bootLevelAndCountry = async (): Promise<void> => {
    const [levelValue, countryList] = await Promise.all([
        accountAuthApi.getUserAuthLevel(),
        accountAuthApi.getUapyCountryList(),
    ])

    currentLevel.value = String(levelValue ?? '0')

    countryOptions.value = toCountryAlpha3Options(countryList)
}

onMounted(() => {
    bootLevelAndCountry().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
})

useOnActivated(() => {
    tableWrapRef.value?.refresh()
    bootLevelAndCountry().catch(() => undefined)
})
</script>

<template>
    <TableSearchWrap
        ref="tableWrapRef"
        :api-fetch="fetchUserAuthList"
        :table-columns="tableColumns"
        :search-conf="searchConf"
        :enable-column-sort="false"
        row-key="id"
    >
        <template #actionsWrap>
            <div class="flex items-center gap-3 text-sm">
                <span>{{ t('平台认证等级设置') }}：</span>
                <a-radio-group
                    :model-value="currentLevel"
                    type="button"
                    size="small"
                    :disabled="levelSaving"
                    @change="handleLevelChange"
                >
                    <a-radio value="0">{{ t('初级认证') }}</a-radio>
                    <a-radio value="1">{{ t('高级认证') }}</a-radio>
                </a-radio-group>
            </div>
        </template>

    </TableSearchWrap>
</template>
