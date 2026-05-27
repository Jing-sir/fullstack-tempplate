<template>
    <!--
        用户资产冻结表：
        - 搜索：用户UID / 币种 / 冻结订单号 / 冻结时间
        - 操作：解冻（opState === 1 时显示）
        - 无导出按钮（老项目中导出逻辑被注释掉）
    -->
    <TableSearchWrap
        ref="tableRef"
        :search-conf="searchConf"
        :table-columns="columns"
        :api-fetch="apiFetch"
    />

    <!-- 解冻弹窗 -->
    <UserAssetThawDrawer
        v-if="modalVisible"
        :visible="modalVisible"
        :active-data="activeData"
        @update:visible="modalVisible = $event"
        @close="modalVisible = false"
        @success="handleRefresh"
    />
</template>

<script lang="ts" setup>
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue';
import type { ColumnType, SearchOption, TableSearchWrapExpose } from '@/interface/TableType';
import assetApi from '@/api/userApi/asset/index';
import type { UserAssetFrozenItem, CoinOption } from '@/api/userApi/asset/index';
import { buildTableFetchResult } from '@/utils/table';
import { useOnActivated } from '@/use/useOnActivated';
import UserAssetThawDrawer from './drawer/UserAssetThawDrawer.vue';

const { t } = useI18n();

// ─── 币种下拉选项 ──────────────────────────────────────────────────────────────
const coinOptions = ref<{ label: string; value: string }[]>([]);
const loadCoinOptions = async (): Promise<void> => {
    try {
        const list = await assetApi.getCoinOptions();
        coinOptions.value = (list as CoinOption[]).map((item) => ({ label: item.symbol, value: item.coinId }));
    } catch {
        coinOptions.value = [];
    }
};

// ─── 搜索配置 ──────────────────────────────────────────────────────────────────
const searchConf = computed<SearchOption[]>(() => [
    { label: t('用户UID'), modelKey: 'userId', type: 'input', placeholder: t('请输入用户UID') },
    { label: t('币种'), modelKey: 'coinId', type: 'select', options: coinOptions.value },
    { label: t('冻结订单号'), modelKey: 'orderNo', type: 'input', placeholder: t('请输入订单号') },
    {
        label: t('冻结时间'),
        modelKey: ['startTime', 'endTime'],
        type: 'date',
    },
]);

// ─── 表格列配置 ────────────────────────────────────────────────────────────────
const columns = computed<ColumnType[]>(() => [
    { title: t('ID'), dataIndex: 'id',
    },
    { title: t('用户UID'), dataIndex: 'userId',
    },
    { title: t('币种'), dataIndex: 'symbol' },
    { title: t('业务类型'), dataIndex: 'frozenType' },
    { title: t('冻结数量'), dataIndex: 'frozenAmount' },
    { title: t('可解冻数量'), dataIndex: 'thawAmount' },
    { title: t('动账原因'), dataIndex: 'reason',
    },
    { title: t('订单号'), dataIndex: 'orderNo',
    },
    { title: t('操作人'), dataIndex: 'sysUser' },
    { title: t('冻结时间'), dataIndex: 'createTime' },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'unfreeze',
                    text: t('解冻'),
                    type: 'text',
                    size: 'small',
                    show: (record) => Number(record.opState) === 1,
                    onClick: (record) =>
                        handleOpenThawModal(record as unknown as UserAssetFrozenItem),
                },
            ],
        },
    },
]);

// ─── 数据获取 ──────────────────────────────────────────────────────────────────
const apiFetch = async (params?: Record<string, unknown>) => {
    const res = await assetApi.getUserAssetFrozenList((params ?? {}) as unknown as Parameters<typeof assetApi.getUserAssetFrozenList>[0]);
    return buildTableFetchResult({ response: res, params: params ?? {} });
};

// ─── 弹窗逻辑 ──────────────────────────────────────────────────────────────────
const modalVisible = ref(false);
const activeData = ref<UserAssetFrozenItem>({} as UserAssetFrozenItem);

const handleOpenThawModal = (record: UserAssetFrozenItem) => {
    activeData.value = record;
    modalVisible.value = true;
};

const tableRef = ref<TableSearchWrapExpose | null>(null);
const handleRefresh = () => {
    tableRef.value?.refresh();
};

// ─── 左侧菜单点击（onActivated）刷新表格数据 ────────────────────────────────────
onMounted(() => { loadCoinOptions(); });
useOnActivated(() => {
    tableRef.value?.refresh();
    loadCoinOptions();
});

</script>
