<script setup lang="ts">
import ResetPasswordsDrawer from './drawer/ResetPasswordsDrawer.vue'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import StatusText from '@/components/TableSearchWrap/components/StatusText.vue'
import type {
    ColumnType,
    SearchOption,
    TableSearchSorterConfig,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType'
import type { SystemUserRow } from '@/interface/SystemManageType'
import sysAccountApi from '@/api/sys/account'
import useConfirmAction from '@/use/useConfirmAction'
import { Message } from '@arco-design/web-vue'

const { t } = useI18n()
const router = useRouter()
const { isShowBtn: buttonPermissions } = useButtonRole()
const { confirmAndRun } = useConfirmAction()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)
const resetVisible = ref(false)
const resetType = ref<'loginPwd' | '2FA'>('loginPwd')
const resetUserId = ref('')

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'add',
        text: t('新增管理员'),
        type: 'primary',
        onClick: async () => {
            await router.push('/systemManage/addAccount')
        },
    },
])

// 使用 computed 而非 ref，确保语言切换时 label/placeholder 响应式更新。
const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('管理员账号'),
        modelKey: 'account',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('姓名'),
        modelKey: 'realName',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
])

const searchSorter: TableSearchSorterConfig = {
    enabled: true,
}

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('序号'), slotName: 'index' },
    { title: t('管理员账号'), dataIndex: 'account', sorter: false },
    { title: t('姓名'), dataIndex: 'realName', sorter: false },
    { title: t('角色'), dataIndex: 'roleName', sorter: false },
    {
        title: t('账号状态'),
        dataIndex: 'state',
        // 账号状态列需要支持“可操作开关 + 只读状态文本”两种渲染形态，
        // 当前由页面 slot 根据权限动态切换，暂不下沉为通用 cellPreset。
        slotName: 'state',
        sorter: {
            type: 'enum',
            enumOrder: [1, 2, 3],
        },
    },
    {
        title: t('最后登陆时间'),
        dataIndex: 'lastLoginTime',
        sorter: {
            type: 'date',
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
                    buttonKey: 'resetPassword',
                    text: t('重置登录密码'),
                    status: 'danger',
                    onClick: (record) =>
                        handleCloseDialog(String(record.userId || ''), 'loginPwd'),
                },
                {
                    buttonKey: 'reset2FA',
                    text: t('重置2FA'),
                    status: 'danger',
                    onClick: (record) =>
                        handleCloseDialog(String(record.userId || ''), '2FA'),
                },
                {
                    buttonKey: 'edit',
                    text: t('编辑'),
                    disabled: (record) => Number(record.state) === 1,
                    onClick: async (record) => {
                        await router.push(`/systemManage/editAccount/${String(record.userId || '')}`)
                    },
                },
            ],
        },
    },
])

const fetchUserList = (params: Record<string, unknown> = {}) =>
    sysAccountApi.sysUserList(params as Parameters<typeof sysAccountApi.sysUserList>[0])

const handleCloseDialog = (userId: string, type: 'loginPwd' | '2FA'): void => {
    resetVisible.value = true
    resetUserId.value = userId
    resetType.value = type
}

/**
 * 状态切换属于敏感操作，执行前统一二次确认。
 * 这样可以避免开关误触直接落库，交互也和系统里其它状态切换行为保持一致。
 */
const handleStatusChange = (nextState: number, record: SystemUserRow): void => {
    const nextStatusText = nextState === 1 ? t('启用') : t('禁用')

    confirmAndRun({
        content: `${t('是否确认执行该操作？')}（${nextStatusText}）`,
        onOk: async () => {
            await sysAccountApi.sysUserAddOrUpdate({ state: nextState, id: record.userId })
            Message.success(t('操作成功'))
            await tableWrapRef.value?.refresh()
        },
    })
}

useOnActivated(() => {
    tableWrapRef.value?.refresh()
})
</script>

<template>
    <div>
        <TableSearchWrap
            ref="tableWrapRef"
            :api-fetch="fetchUserList"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :search-sorter="searchSorter"
            :toolbar-buttons="toolbarButtons"
            row-key="userId"
        >
            <template #index="{ rowIndex, pagination }">
                {{ ((pagination?.current ?? 1) - 1) * (pagination?.pageSize ?? 20) + rowIndex + 1 }}
            </template>

            <template #state="{ record }">
                <a-switch
                    v-if="buttonPermissions('disable')"
                    :model-value="record.state"
                    :checked-value="1"
                    :unchecked-value="2"
                    :checked-text="t('启用')"
                    :unchecked-text="record.state === 3 ? t('冻结') : t('禁用')"
                    @change="(value) => handleStatusChange(Number(value), record)"
                />
                <StatusText v-else :value="record.state" preset="account" />
            </template>
        </TableSearchWrap>

        <ResetPasswordsDrawer
            v-model:visible="resetVisible"
            :type="resetType"
            :user-id="resetUserId"
            @on-success="tableWrapRef?.refresh()"
        />
    </div>
</template>
