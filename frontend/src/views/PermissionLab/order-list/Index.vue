<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import PermissionButton from '@/components/TableSearchWrap/components/PermissionButton.vue'
import type {
    ColumnType,
    SearchOption,
    TableSearchWrapExpose,
    TableToolbarButtonConfig,
    TabsType,
} from '@/interface/TableType'

interface PermissionLabOrder {
    [key: string]: unknown
    id: string
    customer: string
    amount: string
    status: 'all' | 'review' | 'completed'
    createdAt: string
}

const { t } = useI18n()
const router = useRouter()
const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

const tabs: TabsType[] = [
    {
        name: '全部订单',
        code: 'all',
        role: 'permissionLabOrders-tabAll',
    },
    {
        name: '待审核',
        code: 'review',
        role: 'permissionLabOrders-tabReview',
    },
    {
        name: '已完成',
        code: 'completed',
        role: 'permissionLabOrders-tabCompleted',
    },
]

const { activeKey, fetchShowTabs } = useTabsRole(tabs, 'all')

const mockOrders: PermissionLabOrder[] = [
    {
        id: 'LAB-20260607-001',
        customer: 'Alpha Trading',
        amount: '12,800.00 USDT',
        status: 'review',
        createdAt: '2026-06-07 09:15:00',
    },
    {
        id: 'LAB-20260607-002',
        customer: 'Nova Payment',
        amount: '8,460.50 USDT',
        status: 'completed',
        createdAt: '2026-06-07 10:30:00',
    },
    {
        id: 'LAB-20260607-003',
        customer: 'Orbit Commerce',
        amount: '21,300.00 USDT',
        status: 'review',
        createdAt: '2026-06-07 11:45:00',
    },
]

const searchConf = computed<SearchOption[]>(() => [
    {
        label: t('订单号'),
        modelKey: 'orderId',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
    {
        label: t('客户名称'),
        modelKey: 'customer',
        placeholder: t('请输入'),
        type: 'input',
        value: '',
    },
])

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'add',
        text: t('新增订单'),
        type: 'primary',
        onClick: () => {
            Message.success(t('新增订单权限验证通过'))
        },
    },
    {
        buttonKey: 'export',
        text: t('导出订单'),
        onClick: () => {
            Message.success(t('导出订单权限验证通过'))
        },
    },
])

const statusText = (status: PermissionLabOrder['status']): string => {
    if (status === 'review') return t('待审核')
    if (status === 'completed') return t('已完成')
    return t('全部订单')
}

const statusColor = (status: PermissionLabOrder['status']): string =>
    status === 'review' ? 'orange' : status === 'completed' ? 'green' : 'gray'

const handleTabAction = (message: string): void => {
    Message.success(t(message))
}

const tableColumns = computed<ColumnType[]>(() => [
    {
        title: t('订单号'),
        dataIndex: 'id',
        fixed: 'left',
        cellPreset: {
            type: 'copyableText',
        },
    },
    { title: t('客户名称'), dataIndex: 'customer', sorter: false },
    { title: t('订单金额'), dataIndex: 'amount', amountFormat: false, sorter: false },
    { title: t('订单状态'), dataIndex: 'status', slotName: 'status', sorter: false },
    {
        title: t('创建时间'),
        dataIndex: 'createdAt',
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
                    buttonKey: 'detail',
                    text: t('查看详情'),
                    onClick: async (record) => {
                        await router.push(`/permissionLab/orderDetail/${String(record.id)}`)
                    },
                },
                {
                    buttonKey: 'edit',
                    text: t('编辑'),
                    onClick: () => {
                        Message.success(t('编辑订单权限验证通过'))
                    },
                },
                {
                    buttonKey: 'delete',
                    text: t('删除'),
                    status: 'danger',
                    confirm: {
                        content: t('是否确认执行该操作？'),
                    },
                    onClick: () => {
                        Message.success(t('删除订单权限验证通过'))
                    },
                },
            ],
        },
    },
])

const fetchOrders = async (
    params: Record<string, unknown> = {},
): Promise<PermissionLabOrder[]> => {
    const orderId = String(params.orderId ?? '').trim().toLowerCase()
    const customer = String(params.customer ?? '').trim().toLowerCase()

    return mockOrders.filter((order) => {
        const matchesTab = activeKey.value === 'all' || order.status === activeKey.value
        const matchesOrder = !orderId || order.id.toLowerCase().includes(orderId)
        const matchesCustomer = !customer || order.customer.toLowerCase().includes(customer)
        return matchesTab && matchesOrder && matchesCustomer
    })
}

watch(activeKey, () => {
    void tableWrapRef.value?.refresh()
})
</script>

<template>
    <div class="flex min-h-0 flex-col gap-4">
        <a-tabs v-if="fetchShowTabs.length" v-model:active-key="activeKey" type="line">
            <a-tab-pane
                v-for="tab in fetchShowTabs"
                :key="tab.code"
                :title="t(tab.name)"
            />
        </a-tabs>

        <div v-if="activeKey === 'review'" class="flex flex-wrap items-center gap-2">
            <PermissionButton
                button-key="approve"
                type="primary"
                @click="handleTabAction('审核通过权限验证通过')"
            >
                {{ t('审核通过') }}
            </PermissionButton>
            <PermissionButton
                button-key="reject"
                status="danger"
                @click="handleTabAction('审核驳回权限验证通过')"
            >
                {{ t('审核驳回') }}
            </PermissionButton>
        </div>

        <div v-if="activeKey === 'completed'" class="flex flex-wrap items-center gap-2">
            <PermissionButton
                button-key="reopen"
                @click="handleTabAction('重新打开权限验证通过')"
            >
                {{ t('重新打开') }}
            </PermissionButton>
        </div>

        <TableSearchWrap
            v-if="fetchShowTabs.length"
            ref="tableWrapRef"
            :api-fetch="fetchOrders"
            :table-columns="tableColumns"
            :search-conf="searchConf"
            :toolbar-buttons="toolbarButtons"
            :enable-column-sort="false"
            :table-props="{ pagination: false }"
            row-key="id"
        >
            <template #status="{ record }">
                <a-tag :color="statusColor(record.status)">
                    {{ statusText(record.status) }}
                </a-tag>
            </template>
        </TableSearchWrap>

        <a-empty v-else :description="t('暂无可访问的标签页')" />
    </div>
</template>
