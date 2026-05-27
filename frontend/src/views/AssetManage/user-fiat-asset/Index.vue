<template>
    <!--
        用户法币资产页：
        - 搜索：用户UID / 代理商ID / 代理商名称 / 资产类型（法币币种下拉） / 账户创建时间 / 账户更新时间
        - 状态列：老项目有自定义 slot，这里改用 statusText preset
        - 账户hash：使用省略号展示（TableSearchWrap 默认行为）
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

// ─── 法币币种下拉选项 ──────────────────────────────────────────────────────────
const coinOptions = ref<{ label: string; value: string | number }[]>([]);
const loadCoinOptions = async (): Promise<void> => {
    try {
        const res = await fiatUserAssetApi.getFiatCoinOptions();
        const safeList = Array.isArray(res) ? res : [];
        coinOptions.value = safeList.map((item) => ({
            label: item.label ?? item.name ?? item.symbol ?? String(item.id),
            value: item.value ?? item.id ?? '',
        }));
    } catch {
        // 选项接口异常时不抛出到组件层，避免影响主列表挂载。
        coinOptions.value = [];
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
        label: t('账户创建时间'),
        modelKey: ['createTimeStart', 'createTimeEnd'],
        type: 'date',
    },
    {
        label: t('账户更新时间'),
        modelKey: ['updateTimeStart', 'updateTimeEnd'],
        type: 'date',
    },
]);

// ─── 表格列配置 ────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id',
    },
    { title: t('用户UID'), dataIndex: 'accountId',
    },
    { title: t('代理商ID'), dataIndex: 'agentId',
    },
    { title: t('代理商名称'), dataIndex: 'agentName' },
    { title: t('资产类型'), dataIndex: 'currency' },
    { title: t('可用数量'), dataIndex: 'balance' },
    { title: t('收单待结算数量'), dataIndex: 'acquirerFrozen' },
    { title: t('提现冻结数量'), dataIndex: 'withdrawFrozen' },
    { title: t('代付余额'), dataIndex: 'outlayBalance' },
    { title: t('代付待结算数量'), dataIndex: 'outlayFrozen' },
    {
        title: t('状态'),
        dataIndex: 'status',
        // 老项目有 headersCustom 自定义 status 列，这里改用 statusText preset
        cellPreset: { type: 'statusText', preset: 'fiatUserAssetStatus' },
    },
    { title: t('账户hash'), dataIndex: 'hash',
    },
    { title: t('账户创建时间'), dataIndex: 'createTime' },
    { title: t('账户更新时间'), dataIndex: 'updateTime' },
]);

// ─── 数据获取 ──────────────────────────────────────────────────────────────────
const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await fiatUserAssetApi.getFiatUserAssetList(
        (params ?? {}) as Parameters<typeof fiatUserAssetApi.getFiatUserAssetList>[0],
    );
    return buildTableFetchResult({ response: res, params: params ?? {} });
};

// ─── 导出配置 ──────────────────────────────────────────────────────────────────
const exportConfig = computed<TableExportConfig>(() => ({
    exportApi: async (params: Record<string, unknown>) =>
        fiatUserAssetApi.exportFiatUserAssetList(
            params as Parameters<typeof fiatUserAssetApi.exportFiatUserAssetList>[0],
        ),
    fileName: `${t('用户法币资产')}.xlsx`,
    buttonKey: 'export',
}));

// ─── 左侧菜单点击（onActivated）刷新表格数据 + 重新拉取法币币种下拉 ──────────────────
// tabbar 切换（#no-refresh）时 useOnActivated 内部跳过，保留搜索缓存。
const tableRef = ref<TableSearchWrapExpose | null>(null);
useOnActivated(() => {
    tableRef.value?.refresh();
    void loadCoinOptions();
});

</script>
