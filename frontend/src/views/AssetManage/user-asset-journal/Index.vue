<template>
    <!--
        用户资产流水页：
        - 搜索：用户UID / 历史代理商 / 动账订单号 / 动账类型（接口获取） / 状态 / 动账时间
        - 支持导出
        - 状态列使用 statusText preset
    -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
        :export-config="exportConfig"
    />
</template>

<script lang="ts" setup>
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue';
import type { ColumnType, SearchOption, TableExportConfig, TableSearchWrapExpose } from '@/interface/TableType';
import assetApi from '@/api/userApi/asset/index';
import type { AssetLogTypeItem } from '@/api/userApi/asset';
import { buildTableFetchResult } from '@/utils/table';
import { useOnActivated } from '@/use/useOnActivated';

const { t } = useI18n();

// ─── 动账类型下拉选项（activated 时异步拉取） ────────────────────────────────────
const typeOptions = ref<{ label: string; value: number | string }[]>([]);
const loadTypeOptions = async (): Promise<void> => {
    try {
        const list = await assetApi.getAssetLogTypeList();
        const safeList = Array.isArray(list) ? list : [];
        typeOptions.value = safeList.map((item: AssetLogTypeItem) => ({
            label: item.name,
            value: item.code,
        }));
    } catch {
        // 下拉加载失败时仅清空选项，不中断页面渲染流程，避免 keep-alive 激活时白屏。
        typeOptions.value = [];
    }
};

// ─── 搜索配置 ──────────────────────────────────────────────────────────────────
const searchConf = computed<SearchOption[]>(() => [
    { label: t('用户UID'), modelKey: 'accountId', type: 'input', placeholder: t('请输入') },
    { label: t('历史代理商'), modelKey: 'historyAgentName', type: 'input', placeholder: t('请输入') },
    { label: t('动账订单号'), modelKey: 'sourceOrderNo', type: 'input', placeholder: t('请输入') },
    {
        label: t('动账类型'),
        modelKey: 'sourceType',
        type: 'select',
        options: typeOptions.value,
    },
    {
        label: t('状态'),
        modelKey: 'state',
        type: 'select',
        options: [
            { label: t('已上账'), value: 1 },
            { label: t('失败'), value: 2 },
            { label: t('待上账'), value: 3 },
            { label: t('链异常'), value: 4 },
        ],
    },
    {
        label: t('动账时间'),
        modelKey: ['startTime', 'endTime'],
        type: 'date',
    },
]);

// ─── 表格列配置 ────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: t('流水ID'), dataIndex: 'id',
    },
    { title: t('用户UID'), dataIndex: 'accountId',
    },
    { title: t('历史代理商'), dataIndex: 'historyAgentName' },
    { title: t('动账币种'), dataIndex: 'symbol' },
    { title: t('动账金额'), dataIndex: 'amount' },
    { title: t('动账订单号'), dataIndex: 'sourceOrderNo',
    },
    { title: t('动账类型'), dataIndex: 'sourceTypeName' },
    {
        title: t('状态'),
        dataIndex: 'state',
        cellPreset: { type: 'statusText', preset: 'userAssetLogState' },
    },
    { title: t('动账说明'), dataIndex: 'reason',
    },
    { title: t('可用期初金额'), dataIndex: 'beforeBalance' },
    { title: t('可用期末金额'), dataIndex: 'afterBalance' },
    { title: t('AML资产期初'), dataIndex: 'beforeAmlBalance' },
    { title: t('AML资产期末'), dataIndex: 'afterAmlBalance' },
    { title: t('动账前冻结金额'), dataIndex: 'beforeFrozenBalanceTotal' },
    { title: t('动账后冻结金额'), dataIndex: 'afterFrozenBalanceTotal' },
    { title: t('充币冻结期初金额'), dataIndex: 'beforeDepositCoinFrozenBalance' },
    { title: t('充币冻结期末金额'), dataIndex: 'afterDepositCoinFrozenBalance' },
    { title: t('提币业务冻结期初金额'), dataIndex: 'beforeFrozenBalance' },
    { title: t('提币业务冻结期末金额'), dataIndex: 'afterFrozenBalance' },
    { title: t('风控冻结期初金额'), dataIndex: 'beforeRiskFrozenBalance' },
    { title: t('风控冻结期末金额'), dataIndex: 'afterRiskFrozenBalance' },
    { title: t('手工冻结期初金额'), dataIndex: 'beforeManualFrozenBalance' },
    { title: t('手工冻结期末金额'), dataIndex: 'afterManualFrozenBalance' },
    { title: t('闪兑业务冻结期初金额'), dataIndex: 'beforeSwapFrozenBalance' },
    { title: t('闪兑业务冻结期末金额'), dataIndex: 'afterSwapFrozenBalance' },
    { title: t('质押借贷业务冻结期初金额'), dataIndex: 'beforeBorrowFrozenBalance' },
    { title: t('质押借贷业务冻结期末金额'), dataIndex: 'afterBorrowFrozenBalance' },
    { title: t('汇款业务冻结期初金额'), dataIndex: 'beforeRemitFrozenBalance' },
    { title: t('汇款业务冻结期末金额'), dataIndex: 'afterRemitFrozenBalance' },
    { title: t('可消费卡期初金额'), dataIndex: 'beforeCardBalance' },
    { title: t('可消费卡期末金额'), dataIndex: 'afterCardBalance' },
    { title: t('卡消费业务冻结期初金额'), dataIndex: 'beforeCardFrozenBalance' },
    { title: t('卡消费业务冻结期末金额'), dataIndex: 'afterCardFrozenBalance' },
    { title: t('动账时间'), dataIndex: 'createTime' },
    { title: t('动账版本'), dataIndex: 'version' },
    { title: t('动账hash'), dataIndex: 'hash',
    },
    { title: t('备注'), dataIndex: 'remarks', fixed: 'right' },
]);

// ─── 数据获取 ──────────────────────────────────────────────────────────────────
const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await assetApi.getUserAssetLogList((params ?? {}) as Parameters<typeof assetApi.getUserAssetLogList>[0]);
    const result = buildTableFetchResult({ response: res, params: params ?? {} });
    // 后端只返回 sourceType code，前端用 typeOptions 映射文案注入 sourceTypeName
    result.list = result.list.map((row) => ({
        ...row,
        sourceTypeName: typeOptions.value.find((opt) => opt.value === row.sourceType)?.label ?? row.sourceType ?? '--',
    }));
    return result;
};

// ─── 导出 ──────────────────────────────────────────────────────────────────────
const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) =>
        assetApi.exportUserAssetLogList(params as Parameters<typeof assetApi.exportUserAssetLogList>[0]),
    fileName: `${t('用户资产流水')}.xlsx`,
    buttonKey: 'export',
}));

// ─── tableRef 供 useOnActivated 调用 refresh ───────────────────────────────────
const tableRef = ref<TableSearchWrapExpose | null>(null);

// 首次 mount 加载下拉选项；keep-alive 激活时也重新拉取（tabbar 切换跳过）。
onMounted(() => { loadTypeOptions(); });
// ─── 左侧菜单点击（onActivated）刷新数据 + 重新拉取动账类型下拉 ───────────────────
useOnActivated(() => {
    tableRef.value?.refresh();
    loadTypeOptions();
});
</script>
