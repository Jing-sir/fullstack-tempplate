<template>
    <!--
        用户法币资产流水页：
        - 搜索：用户UID / 代理商ID / 代理商名称 / 资产类型（法币币种下拉） / 动账类型（接口下拉） / 动账时间
        - 状态列使用 statusText preset
        - 支持导出
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
import fiatUserAssetApi from '@/api/userApi/fiatUserAsset';
import { buildTableFetchResult } from '@/utils/table';
import { useOnActivated } from '@/use/useOnActivated';

const { t } = useI18n();

// ─── 法币币种下拉 ──────────────────────────────────────────────────────────────
const coinOptions = ref<{ label: string; value: string | number }[]>([]);

// ─── 动账类型下拉 ──────────────────────────────────────────────────────────────
const logTypeOptions = ref<{ label: string; value: string | number }[]>([]);

const loadSelectOptions = async (): Promise<void> => {
    try {
        const [coinRes, logTypeRes] = await Promise.all([
            fiatUserAssetApi.getFiatCoinOptions(),
            fiatUserAssetApi.getFiatUserAssetLogTypeList(),
        ]);

        const safeCoinList = Array.isArray(coinRes) ? coinRes : [];
        const safeLogTypeList = Array.isArray(logTypeRes) ? logTypeRes : [];

        coinOptions.value = safeCoinList.map((item) => ({
            label: item.label ?? item.name ?? item.symbol ?? String(item.id),
            value: item.value ?? item.id ?? '',
        }));
        logTypeOptions.value = safeLogTypeList.map((item) => ({
            label: item.name,
            value: item.code,
        }));
    } catch {
        // 某个下拉接口失败时兜底为空数组，避免激活钩子把页面渲染链打断。
        coinOptions.value = [];
        logTypeOptions.value = [];
    }
};

// ─── 搜索配置 ──────────────────────────────────────────────────────────────────
const searchConf = computed<SearchOption[]>(() => [
    { label: t('用户UID'), modelKey: 'accountId', type: 'input', placeholder: t('请输入') },
    { label: t('代理商ID'), modelKey: 'agentId', type: 'input', placeholder: t('请输入') },
    { label: t('代理商名称'), modelKey: 'agentName', type: 'input', placeholder: t('请输入') },
    {
        label: t('资产类型'),
        modelKey: 'coinId',
        type: 'select',
        options: coinOptions.value,
    },
    {
        label: t('动账类型'),
        modelKey: 'sourceType',
        type: 'select',
        options: logTypeOptions.value,
    },
    {
        label: t('动账时间'),
        modelKey: ['createTimeStart', 'createTimeEnd'],
        type: 'date',
    },
]);

// ─── 表格列配置 ────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id',
    },
    { title: t('用户UID'), dataIndex: 'accountId',
    },
    { title: t('代理商名称'), dataIndex: 'agentName' },
    { title: t('代理商ID'), dataIndex: 'agentId',
    },
    { title: t('动账币种'), dataIndex: 'currency' },
    { title: t('动账金额'), dataIndex: 'amount' },
    { title: t('动账订单号'), dataIndex: 'sourceOrderNo',
    },
    { title: t('动账类型'), dataIndex: 'sourceTypeDesc' },
    {
        title: t('状态'),
        dataIndex: 'state',
        // 老项目中 headersCustom=['state'] 有自定义颜色，改用 statusText preset
        cellPreset: { type: 'statusText', preset: 'fiatUserAssetLogState' },
    },
    { title: t('动账说明'), dataIndex: 'reason',
    },
    { title: t('可用期初金额'), dataIndex: 'beforeBalance' },
    { title: t('可用期末金额'), dataIndex: 'afterBalance' },
    { title: t('收单待结算期初金额'), dataIndex: 'beforeAcquirerFrozen' },
    { title: t('收单待结算期末金额'), dataIndex: 'afterAcquirerFrozen' },
    { title: t('提现冻结期初'), dataIndex: 'beforeWithdrawFrozen' },
    { title: t('提现冻结期末'), dataIndex: 'afterWithdrawFrozen' },
    { title: t('代付期初金额'), dataIndex: 'beforeOutlayBalance' },
    { title: t('代付期末金额'), dataIndex: 'afterOutlayBalance' },
    { title: t('代付待结算期初金额'), dataIndex: 'beforeOutlayFrozen' },
    { title: t('代付待结算期末金额'), dataIndex: 'afterOutlayFrozen' },
    { title: t('动账时间'), dataIndex: 'createTime' },
    { title: t('备注'), dataIndex: 'remarks' },
]);

// ─── 数据获取 ──────────────────────────────────────────────────────────────────
const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await fiatUserAssetApi.getFiatUserAssetLogList(
        (params ?? {}) as Parameters<typeof fiatUserAssetApi.getFiatUserAssetLogList>[0],
    );
    return buildTableFetchResult({ response: res, params: params ?? {} });
};

// ─── 导出配置 ──────────────────────────────────────────────────────────────────
const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) =>
        fiatUserAssetApi.exportFiatUserAssetLogList(
            params as Parameters<typeof fiatUserAssetApi.exportFiatUserAssetLogList>[0],
        ),
    fileName: `${t('用户法币资产流水')}.xlsx`,
    buttonKey: 'export',
}));

// ─── 左侧菜单点击（onActivated）刷新表格数据 + 重新拉取下拉选项 ─────────────────────
// tabbar 切换（#no-refresh）时 useOnActivated 内部跳过，保留搜索缓存。
const tableRef = ref<TableSearchWrapExpose | null>(null);
onMounted(() => { loadSelectOptions(); });
useOnActivated(() => {
    tableRef.value?.refresh();
    loadSelectOptions();
});

</script>
