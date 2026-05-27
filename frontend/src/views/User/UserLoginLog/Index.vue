<script setup lang="ts">
import sysAccountLogApi from '@/api/userApi/sys/accountLog'
import tagApi from '@/api/userApi/tag'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type { AccountLogParams } from '@/api/userApi/types.d'
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableFetchResult,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import { buildTableFetchResult } from '@/utils/table'
import { toTagSelectOptions } from '@/utils/selectOptions'
import { Message } from '@arco-design/web-vue'
import dayjs from 'dayjs'
import { useOnActivated } from '@/use/useOnActivated'

const { t } = useI18n()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

/**
 * 标签筛选来自后端标签管理，保证登录日志和标签模块数据口径一致。
 */
const tagOptions = ref<Array<{ label: string; value: string }>>([])

const platformOptions = [
    { label: t('安卓'), value: 1 },
    { label: t('iOS'), value: 2 },
    { label: t('Web'), value: 3 },
    { label: t('PC'), value: 4 },
    { label: t('H5'), value: 5 },
]

const platformTextMap: Record<string, string> = {
    '1': '安卓',
    '2': 'iOS',
    '3': 'Web',
    '4': 'PC',
    '5': 'H5',
}

const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('用户UID'),
        modelKey: 'accountId',
        type: 'input',
        placeholder: t('请输入用户UID'),
        value: '',
    },
    {
        label: t('邮箱'),
        modelKey: 'operated',
        type: 'input',
        placeholder: t('请输入邮箱'),
        value: '',
    },
    {
        label: t('手机号'),
        modelKey: 'nationalNumber',
        type: 'input',
        placeholder: t('请输入手机号'),
        value: '',
    },
    {
        label: t('用户姓名(中文)'),
        modelKey: 'usernameCn',
        type: 'input',
        placeholder: t('请输入用户姓名'),
        value: '',
    },
    {
        label: t('用户姓名(英文)'),
        modelKey: 'usernameEn',
        type: 'input',
        placeholder: t('请输入用户姓名'),
        value: '',
    },
    {
        label: t('登录方式'),
        modelKey: 'platform',
        type: 'select',
        value: '',
        options: platformOptions,
    },
    {
        label: t('设备唯一ID'),
        modelKey: 'deviceId',
        type: 'input',
        placeholder: t('请输入设备唯一ID'),
        value: '',
    },
    {
        label: t('平台语言'),
        modelKey: 'platformLanguage',
        type: 'input',
        placeholder: t('请输入平台语言'),
        value: '',
    },
    {
        label: t('浏览器语言'),
        modelKey: 'browserLanguage',
        type: 'input',
        placeholder: t('请输入浏览器语言'),
        value: '',
    },
    {
        label: t('设备语言'),
        modelKey: 'deviceLanguage',
        type: 'input',
        placeholder: t('请输入设备语言'),
        value: '',
    },
    {
        label: t('MAC地址'),
        modelKey: 'macAddress',
        type: 'input',
        placeholder: t('请输入MAC地址'),
        value: '',
    },
    {
        label: t('IP地址'),
        modelKey: 'ipAddress',
        type: 'input',
        placeholder: t('请输入IP地址'),
        value: '',
    },
    {
        label: t('用户标签'),
        modelKey: 'labelId',
        type: 'select',
        value: '',
        options: tagOptions.value,
    },
    {
        label: t('登录时间'),
        modelKey: ['startTime', 'endTime'],
        type: 'date',
        timeFormat: 'YYYY-MM-DD HH:mm:ss',
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('用户UID'), dataIndex: 'accountId', fixed: 'left' },
    {
        title: t('标签'),
        dataIndex: 'labelList',
        cellPreset: {
            type: 'labelTags',
            labelListField: 'labelList',
            labelNamesField: 'labelNames',
        },
    },
    { title: t('邮箱'), dataIndex: 'operated' },
    { title: t('用户姓名(中文)'), dataIndex: 'usernameCn' },
    { title: t('用户姓名(英文)'), dataIndex: 'usernameEn' },
    { title: t('登录方式'), dataIndex: 'platform', slotName: 'platform' },
    { title: t('设备agent'), dataIndex: 'userAgent' },
    { title: t('设备唯一ID'), dataIndex: 'deviceId' },
    { title: t('区号'), dataIndex: 'callingCode' },
    { title: t('手机号'), dataIndex: 'nationalNumber' },
    { title: t('平台语言'), dataIndex: 'platformLanguage' },
    { title: t('浏览器语言'), dataIndex: 'browserLanguage' },
    { title: t('设备语言'), dataIndex: 'deviceLanguage' },
    { title: t('MAC地址'), dataIndex: 'macAddress' },
    { title: t('IP地址'), dataIndex: 'ipAddress' },
    { title: t('时区'), dataIndex: 'timeZone' },
    { title: t('登录时间'), dataIndex: 'createTime' },
    { title: t('登录状态'), dataIndex: 'status', slotName: 'status', fixed: 'right' },
])

/**
 * 将搜索参数补齐为接口完整结构，避免缺字段导致后端解析分支不一致。
 */
const normalizeLogParams = (
    params: Record<string, unknown> = {},
): AccountLogParams => ({
    accountId: String(params.accountId || ''),
    browserLanguage: String(params.browserLanguage || ''),
    deviceLanguage: String(params.deviceLanguage || ''),
    endTime: String(params.endTime || ''),
    hostName: String(params.hostName || ''),
    ipAddress: String(params.ipAddress || ''),
    macAddress: String(params.macAddress || ''),
    operated: String(params.operated || ''),
    pageNo: Number(params.pageNo || 1),
    pageSize: Number(params.pageSize || 20),
    platform:
        params.platform === '' || params.platform === null || typeof params.platform === 'undefined'
            ? null
            : Number(params.platform),
    platformLanguage: String(params.platformLanguage || ''),
    startTime: String(params.startTime || ''),
    usernameCn: String(params.usernameCn || ''),
    usernameEn: String(params.usernameEn || ''),
    nationalNumber: String(params.nationalNumber || ''),
    deviceId: String(params.deviceId || ''),
    labelId:
        params.labelId === '' || params.labelId === null || typeof params.labelId === 'undefined'
            ? null
            : String(params.labelId),
})

const fetchAccountLogList = async (
    params: Record<string, unknown> = {},
): Promise<TableFetchResult<Record<string, unknown>>> => {
    const normalizedParams = normalizeLogParams(params)
    const response = await sysAccountLogApi.getAccountLogList(normalizedParams)

    return buildTableFetchResult<Record<string, unknown>>({
        response,
        params: normalizedParams,
    })
}

/**
 * 导出要求必须带登录时间范围，且跨度不超过 365 天，避免大数据量阻塞。
 */
const validateExportParams = (params: Record<string, unknown>): boolean => {
    if (!params.startTime || !params.endTime) {
        Message.warning(t('登录开始时间不能为空'))
        return false
    }

    const start = dayjs(String(params.startTime))
    const end = dayjs(String(params.endTime))

    if (end.diff(start, 'day') > 365) {
        Message.warning(t('请选择365天以内的时间'))
        return false
    }

    return true
}

const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) => {
        const normalizedParams = normalizeLogParams(params)
        return sysAccountLogApi.exportAccountLog({
            ...normalizedParams,
            platform: normalizedParams.platform ?? undefined,
            labelId: normalizedParams.labelId ?? undefined,
            pageNo: 1,
            pageSize: 2000,
        })
    },
    fileName: `${t('用户登录日志')}.xlsx`,
    beforeExport: (params: Record<string, unknown>) => validateExportParams(params),
}))

const queryTags = async (): Promise<void> => {
    const tagList = await tagApi.getTagList()
    tagOptions.value = toTagSelectOptions(tagList)
}

onMounted(() => {
    queryTags().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
})

useOnActivated(() => {
    tableWrapRef.value?.refresh()
    queryTags().catch(() => undefined)
})
</script>

<template>
    <TableSearchWrap
        ref="tableWrapRef"
        :api-fetch="fetchAccountLogList"
        :table-columns="tableColumns"
        :search-conf="searchConf"
        :export-config="exportConfig"
        :enable-column-sort="false"
        row-key="id"
    >
        <template #platform="{ record }">
            {{ t(platformTextMap[String(record.platform)] || '未知') }}
        </template>

        <template #status>
            <span class="text-green-500">{{ t('登录成功') }}</span>
        </template>
    </TableSearchWrap>
</template>
