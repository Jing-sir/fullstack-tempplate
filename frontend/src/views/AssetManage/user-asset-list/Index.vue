<template>
    <!--
        用户资产列表页：
        - 支持按用户UID/所属代理商/标签/可用数量范围/手工冻结/风控冻结/业务冻结/资金类型/是否展示负数等多维度搜索
        - 选择币种后，表格上方展示各类冻结总金额汇总
        - 操作：冻结（可用 > 0）、展示/不展示负资产、详情
        - 支持导出、快照全部资产
    -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
        :export-config="exportConfig"
        :toolbar-buttons="toolbarButtons"
    >
        <!-- 选择币种后在表格顶部展示资产汇总 -->
        <template #totalWrap>
            <div
                v-if="currentCoinId && amountTotal"
                class="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600"
            >
                <span>{{ t('可用总金额') }}：{{ amountTotal.availableAmountTotal }}</span>
                <span>{{ t('提币业务冻结总金额') }}：{{ amountTotal.withdrawalAmountTotal }}</span>
                <span v-if="amountTotal.manualAmountTotal">
                    {{ t('手工冻结总金额') }}：{{ amountTotal.manualAmountTotal }}
                </span>
                <span v-if="amountTotal.riskFrozenBalance">
                    {{ t('风控冻结总金额') }}：{{ amountTotal.riskFrozenBalance }}
                </span>
                <span v-if="amountTotal.swapFrozenBalance">
                    {{ t('闪兑业务冻结总金额') }}：{{ amountTotal.swapFrozenBalance }}
                </span>
                <span v-if="amountTotal.borrowFrozenBalance">
                    {{ t('质押借贷业务冻结总金额') }}：{{ amountTotal.borrowFrozenBalance }}
                </span>
                <span v-if="amountTotal.remitFrozenBalance">
                    {{ t('汇款业务冻结总金额') }}：{{ amountTotal.remitFrozenBalance }}
                </span>
            </div>
        </template>
    </TableSearchWrap>

    <!-- 手工冻结操作弹窗 -->
    <UserAssetFreezeDrawer
        v-if="freezeModalVisible"
        :visible="freezeModalVisible"
        :type="'Frozen'"
        :active-data="activeData"
        @update:visible="freezeModalVisible = $event"
        @close="freezeModalVisible = false"
        @success="handleRefresh"
    />

    <!-- 详情弹窗：显示用户资产的扩展冻结明细 -->
    <a-modal
        v-model:visible="detailVisible"
        :title="t('资产详情')"
        :footer="false"
        width="680px"
    >
        <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item v-for="item in detailFields" :key="item.value" :label="item.label">
                {{ detailRecord[item.value] ?? '-' }}
            </a-descriptions-item>
        </a-descriptions>
    </a-modal>
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue';
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue';
import type {
    ColumnType,
    SearchOption,
    TableExportConfig,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
} from '@/interface/TableType';
import { useOnActivated } from '@/use/useOnActivated';
import useConfirmAction from '@/use/useConfirmAction';
import assetApi from '@/api/userApi/asset/index';
import type { UserAssetItem, UserAssetAmountTotal } from '@/api/userApi/asset/index';
import { buildTableFetchResult } from '@/utils/table';
import UserAssetFreezeDrawer from './drawer/UserAssetFreezeDrawer.vue';

const { t } = useI18n();
const { confirmAndRun } = useConfirmAction();

// ─── 搜索配置 ──────────────────────────────────────────────────────────────────
/**
 * 注意：balanceArray/frozenArray 等范围搜索在 TableSearchWrap 中通过两个 input 组合实现，
 * 这里用两个独立 input 字段替代老项目的 InputSE 组件，保持后端参数不变。
 */
const searchConf = computed<SearchOption[]>(() => [
    { label: t('用户UID'), modelKey: 'userId', type: 'input', placeholder: t('请输入') },
    { label: t('所属代理商'), modelKey: 'agentName', type: 'input', placeholder: t('请输入') },
    { label: t('用户标签ID'), modelKey: 'labelId', type: 'input', placeholder: t('请输入') },
    { label: t('资金类型'), modelKey: 'coinId', type: 'input', placeholder: t('请输入') },
    {
        label: t('是否展示负数'),
        modelKey: 'showMinusAccount',
        type: 'select',
        options: [
            { label: t('是'), value: 1 },
            { label: t('否'), value: 2 },
        ],
    },
    { label: t('可用数量(最小)'), modelKey: 'startBalance', type: 'input', placeholder: t('请输入') },
    { label: t('可用数量(最大)'), modelKey: 'endBalance', type: 'input', placeholder: t('请输入') },
    { label: t('手工冻结(最小)'), modelKey: 'startManualFrozenBalance', type: 'input', placeholder: t('请输入') },
    { label: t('手工冻结(最大)'), modelKey: 'endManualFrozenBalance', type: 'input', placeholder: t('请输入') },
    { label: t('风控冻结(最小)'), modelKey: 'startRiskFrozenBalance', type: 'input', placeholder: t('请输入') },
    { label: t('风控冻结(最大)'), modelKey: 'endRiskFrozenBalance', type: 'input', placeholder: t('请输入') },
    { label: t('业务冻结(最小)'), modelKey: 'startFrozenBalance', type: 'input', placeholder: t('请输入') },
    { label: t('业务冻结(最大)'), modelKey: 'endFrozenBalance', type: 'input', placeholder: t('请输入') },
]);

// ─── 表格列配置 ────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id',
    },
    { title: t('用户UID'), dataIndex: 'userId',
    },
    { title: t('所属代理商'), dataIndex: 'agentName' },
    { title: t('资金类型'), dataIndex: 'symbol' },
    {
        title: t('用户标签'),
        dataIndex: 'labelList',
        cellPreset: { type: 'labelTags', labelListField: 'labelList', labelNamesField: 'labelNames' },
    },
    { title: t('可用余额'), dataIndex: 'balance' },
    { title: t('AML资产'), dataIndex: 'amlBalance' },
    { title: t('冻结总数量'), dataIndex: 'frozenBalanceTotal' },
    { title: t('可消费卡余额'), dataIndex: 'cardBalance' },
    {
        title: t('状态'),
        dataIndex: 'state',
        cellPreset: { type: 'statusText', preset: 'userState' },
    },
    { title: t('账户hash'), dataIndex: 'hash',
    },
    { title: t('账户创建时间'), dataIndex: 'createTime' },
    { title: t('账户更新时间'), dataIndex: 'updateTime' },
    { title: t('version'), dataIndex: 'version' },
    {
        title: t('是否展示负数'),
        dataIndex: 'showMinusAccount',
        cellPreset: { type: 'statusText', preset: 'showMinusAccount' },
    },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'detail',
                    text: '详情',
                    type: 'text',
                    size: 'small',
                    onClick: (record) => handleOpenDetail(record as unknown as UserAssetItem),
                },
                {
                    buttonKey: 'freeze',
                    text: '冻结',
                    type: 'text',
                    status: 'danger',
                    size: 'small',
                    show: (record) => Number(record.balance) > 0,
                    onClick: (record) =>
                        handleOpenFreezeModal(record as unknown as UserAssetItem),
                },
                {
                    buttonKey: 'DisplayNegativeAssets',
                    text: (record) =>
                        Number(record.showMinusAccount) === 1 ? '不展示负资产' : '展示负资产',
                    type: 'text',
                    size: 'small',
                    onClick: (record) =>
                        handleToggleShowMinus(record as unknown as UserAssetItem),
                },
            ],
        },
    },
]);

// ─── 资产汇总状态（选了币种才展示） ────────────────────────────────────────────────
const currentCoinId = ref('');
const amountTotal = ref<UserAssetAmountTotal | null>(null);

// ─── 数据获取 ──────────────────────────────────────────────────────────────────
const apiFetch = async (params?: Record<string, unknown>) => {
    const p = params ?? {};
    const res = await assetApi.getUserAssetList(p as Parameters<typeof assetApi.getUserAssetList>[0]);
    // 如果指定了 coinId，同时拉汇总金额
    if (p.coinId) {
        currentCoinId.value = String(p.coinId);
        assetApi.getUserAssetAmountTotal(p as Parameters<typeof assetApi.getUserAssetAmountTotal>[0])
            .then((r) => { amountTotal.value = r; })
            .catch(() => { amountTotal.value = null; });
    } else {
        currentCoinId.value = '';
        amountTotal.value = null;
    }
    return buildTableFetchResult({ response: res, params: p });
};

// ─── 工具栏按钮 ────────────────────────────────────────────────────────────────
const snapshotLoading = ref(false);
const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'snapshot',
        text: t('快照全部资产'),
        type: 'primary' as const,
        loading: snapshotLoading.value,
        onClick: async () => {
            if (snapshotLoading.value) return;
            snapshotLoading.value = true;
            try {
                await assetApi.snapshotUserAsset();
                Message.success(t('快照成功'));
            } finally {
                snapshotLoading.value = false;
            }
        },
    },
]);

// ─── 导出配置 ──────────────────────────────────────────────────────────────────
const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) =>
        assetApi.exportUserAssetList(params as Parameters<typeof assetApi.exportUserAssetList>[0]),
    fileName: `${t('用户资产')}.xlsx`,
    buttonKey: 'export',
}));

// ─── 冻结弹窗 ──────────────────────────────────────────────────────────────────
const freezeModalVisible = ref(false);
const activeData = ref<UserAssetItem>({} as UserAssetItem);
const handleOpenFreezeModal = (record: UserAssetItem) => {
    activeData.value = record;
    freezeModalVisible.value = true;
};

// ─── 修改负资产展示状态 ────────────────────────────────────────────────────────
const handleToggleShowMinus = (record: UserAssetItem) => {
    const next: 1 | 2 = record.showMinusAccount === 1 ? 2 : 1;
    const content = record.showMinusAccount === 1 ? t('确认关闭负资产展示吗？') : t('确认开启负资产展示吗？');
    confirmAndRun({
        content,
        onOk: async () => {
            await assetApi.updateUserAssetShowMinus({ id: record.id!, showMinusAccount: next });
            Message.success(t('修改展示状态成功'));
            handleRefresh();
        },
    });
};

// ─── 详情弹窗 ──────────────────────────────────────────────────────────────────
const detailVisible = ref(false);
const detailRecord = ref<Record<string, unknown>>({});

/**
 * 详情字段顺序保持与老项目 infoDataConfig 一致，
 * 包含表格列字段 + 7 个额外冻结明细字段。
 */
const detailFields = [
    { label: 'ID', value: 'id' },
    { label: t('用户UID'), value: 'userId' },
    { label: t('所属代理商'), value: 'agentName' },
    { label: t('资金类型'), value: 'symbol' },
    { label: t('可用余额'), value: 'balance' },
    { label: t('AML资产'), value: 'amlBalance' },
    { label: t('质押借贷业务冻结数量'), value: 'borrowFrozenBalance' },
    { label: t('汇款业务冻结数量'), value: 'remitFrozenBalance' },
    { label: t('闪兑业务冻结数量'), value: 'swapFrozenBalance' },
    { label: t('提币业务冻结数量'), value: 'frozenBalance' },
    { label: t('充币业务冻结数量'), value: 'depositCoinFrozenCount' },
    { label: t('风控冻结数量'), value: 'riskFrozenBalance' },
    { label: t('手工冻结数量'), value: 'manualFrozenBalance' },
    { label: t('冻结总数量'), value: 'frozenBalanceTotal' },
    { label: t('可消费卡余额'), value: 'cardBalance' },
    { label: t('状态'), value: 'state' },
    { label: t('账户hash'), value: 'hash' },
    { label: t('账户创建时间'), value: 'createTime' },
    { label: t('账户更新时间'), value: 'updateTime' },
    { label: t('version'), value: 'version' },
    { label: t('是否展示负数'), value: 'showMinusAccount' },
];

const handleOpenDetail = (record: UserAssetItem) => {
    // showMinusAccount 转为文案后传给详情弹窗展示
    detailRecord.value = {
        ...record,
        showMinusAccount: record.showMinusAccount === 1 ? t('展示') : t('不展示'),
    } as Record<string, unknown>;
    detailVisible.value = true;
};

// ─── 刷新 ──────────────────────────────────────────────────────────────────────
const tableRef = ref<TableSearchWrapExpose | null>(null);
const handleRefresh = () => {
    tableRef.value?.refresh();
};

// ─── 左侧菜单点击（onActivated）刷新表格数据 ────────────────────────────────────
// tabbar 切换（#no-refresh）时跳过，保留搜索缓存；点击左侧 menu 时刷新。
useOnActivated(() => {
    tableRef.value?.refresh();
});
</script>
