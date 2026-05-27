/**
 * 资产管理 API 模块
 *
 * 对应后端 URL 前缀：
 *   - /agentAsset/*    代理商资产相关
 *   - /userAsset/*     用户资产相关
 *   - /userAssetLog/*  用户资产流水相关
 *   - /virtual/bill/*  用户资产冻结相关
 *
 * 迁移自老项目 src/api/asset/index.ts，仅保留 /asset 模块的 8 个页面所需的接口。
 */
import type { TableResultType } from '@/interface/TableType';
import { Api } from '../../api';

// ─── 代理商资产列表返回项类型 ─────────────────────────────────────────────────────
export interface AgentAssetItem {
    id: string;
    agentId: string;       // 资产人ID
    userId?: string;
    balance: string;       // 可用资产
    frozenBalance: string; // 提现冻结（程序）
    manualFrozenBalance: string; // 风控冻结（人工）
    symbol: string;        // 资产类型
    remarks?: string;      // 备注
}

// ─── 用户资产列表返回项类型 ───────────────────────────────────────────────────────
export interface UserAssetItem {
    id: string;
    userId: string;
    agentName?: string;              // 所属代理商
    symbol: string;                  // 资金类型
    labelList?: { name: string; color: string }[];
    labelNames?: string;
    balance: string;                 // 可用余额
    amlBalance?: string;             // AML资产
    frozenBalanceTotal?: string;     // 冻结总数量
    frozenBalance?: string;          // 提币业务冻结数量
    riskFrozenBalance?: string;      // 风控冻结数量
    manualFrozenBalance?: string;    // 手工冻结数量
    swapFrozenBalance?: string;      // 闪兑业务冻结数量
    borrowFrozenBalance?: string;    // 质押借贷业务冻结数量
    remitFrozenBalance?: string;     // 汇款业务冻结数量
    depositCoinFrozenCount?: string; // 充币业务冻结数量
    cardBalance?: string;            // 可消费卡余额
    state?: number;                  // 1正常 2冻结
    hash?: string;                   // 账户hash
    createTime?: string;
    updateTime?: string;
    version?: number;
    showMinusAccount?: 1 | 2;        // 1展示 2不展示
}

// ─── 用户资产汇总金额类型 ──────────────────────────────────────────────────────────
export interface UserAssetAmountTotal {
    availableAmountTotal: string;  // 可用总金额
    riskAmountTotal?: string;      // 风控冻结金额
    withdrawalAmountTotal: string; // 提现冻结金额
    manualAmountTotal?: string;    // 手工冻结总金额
    riskFrozenBalance?: string;    // 风控冻结总金额
    swapFrozenBalance?: string;    // 闪兑业务冻结总金额
    borrowFrozenBalance?: string;  // 质押借贷业务冻结总金额
    remitFrozenBalance?: string;   // 汇款业务冻结总金额
}

// ─── 用户资产流水返回项类型 ───────────────────────────────────────────────────────
export interface UserAssetLogItem {
    id: string;
    accountId: string;
    historyAgentName?: string;
    symbol?: string;
    amount?: string;
    sourceOrderNo?: string;
    sourceType?: number | string;
    state?: number | null;         // 1已上账 2失败 3待上账 4链异常
    reason?: string;
    beforeBalance?: string;
    afterBalance?: string;
    beforeAmlBalance?: string;
    afterAmlBalance?: string;
    beforeFrozenBalanceTotal?: string;
    afterFrozenBalanceTotal?: string;
    beforeDepositCoinFrozenBalance?: string;
    afterDepositCoinFrozenBalance?: string;
    beforeFrozenBalance?: string;
    afterFrozenBalance?: string;
    beforeRiskFrozenBalance?: string;
    afterRiskFrozenBalance?: string;
    beforeManualFrozenBalance?: string;
    afterManualFrozenBalance?: string;
    beforeSwapFrozenBalance?: string;
    afterSwapFrozenBalance?: string;
    beforeBorrowFrozenBalance?: string;
    afterBorrowFrozenBalance?: string;
    beforeRemitFrozenBalance?: string;
    afterRemitFrozenBalance?: string;
    beforeCardBalance?: string;
    afterCardBalance?: string;
    beforeCardFrozenBalance?: string;
    afterCardFrozenBalance?: string;
    createTime?: string;
    version?: number;
    hash?: string;
    remarks?: string;
}

// ─── 资产流水类型列表项 ───────────────────────────────────────────────────────────
export interface AssetLogTypeItem {
    code: number;
    name: string;
}

// ─── 划转记录返回项类型 ───────────────────────────────────────────────────────────
export interface AgentAssetTransferItem {
    id: string;
    orderNo: string;       // 划转订单号
    symbol: string;        // 资产类型
    cardNo?: string;       // 卡号
    amount: string;        // 发起数量
    fee?: string;          // 扣除手续费
    agentAssetId?: string; // 资产人转出Id
    remarks?: string;      // 备注
    createTime: string;    // 操作时间
}

// ─── 用户资产冻结表返回项类型 ─────────────────────────────────────────────────────
export interface UserAssetFrozenItem {
    id: string;
    userId: string;
    symbol: string;
    frozenType?: string;    // 业务类型
    frozenAmount?: string;  // 冻结数量
    thawAmount?: string;    // 可解冻数量
    reason?: string;        // 动账原因
    orderNo?: string;       // 订单号
    sysUser?: string;       // 操作人
    createTime?: string;    // 冻结时间
    opState?: 1 | 2;        // 1=冻结中 2=已解冻
}

// ─── 用户资产冻结历史返回项类型 ───────────────────────────────────────────────────
export interface UserAssetFrozenLogItem {
    id: string;
    userId: string;
    symbol: string;
    frozenType?: string;
    amount?: string;        // 冻结数量
    reason?: string;        // 冻结原因
    orderNo?: string;       // 冻结订单号
    sysUser?: string;       // 冻结人
    createTime?: string;    // 冻结时间
    typeName?: string;      // 类型文案（冻结/解冻）
    type?: 1 | 2;           // 1冻结 2解冻（用于颜色判断）
}

// ─── 币种下拉选项类型 ─────────────────────────────────────────────────────────────
export interface CoinOption {
    itemId: string;   // 钱包币种id
    symbol: string;   // 币种符号
    coinId: string;   // 币种id（用于搜索参数）
}

// ─── 代理商下拉选项类型 ───────────────────────────────────────────────────────────
export interface AgentOption {
    id: string;
    name: string;
}

// ─── 冻结/解冻请求参数基础类型 ────────────────────────────────────────────────────
export interface AssetFrozenQueryParams {
    userId?: string;
    coinId?: string | null;
    orderNo?: string;
    startTime?: string;
    endTime?: string;
    pageNo: number;
    pageSize: number;
}

class AssetApi extends Api {
    // ─── 通用下拉选项接口 ───────────────────────────────────────────────────────────

    /** 币种下拉（用于代理商资产/划转记录等筛选） */
    getCoinOptions(): Promise<CoinOption[]> {
        return this.api.get('/coin/coinListSel');
    }

    /** 代理商下拉（用于代理商资产/划转记录等筛选） */
    getAgentOptions(): Promise<AgentOption[]> {
        return this.api.get('/agent/choose');
    }

    // ─── 代理商资产接口 ─────────────────────────────────────────────────────────

    /** 代理商资产列表 */
    getAgentAssetList(params: {
        agentId?: string;
        coinId?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<{ list: AgentAssetItem[] } & TableResultType> {
        return this.api.get('/agentAsset/agentAssetList', { params });
    }

    /** 导出代理商资产列表 */
    exportAgentAssetList(params: { agentId?: string; coinId?: string }): Promise<Blob> {
        return this.api.get('/agentAsset/agentAssetList/excelWriter', {
            params,
            responseType: 'blob',
        });
    }

    /** 快照代理商资产 */
    snapshotAgentAsset(): Promise<void> {
        return this.api.get('/agentAsset/snapshot');
    }

    /** 代理商资产冻结 */
    freezeAgentAsset(params: { id: string; amount: string }): Promise<void> {
        return this.api.post('/agentAsset/frozen', params);
    }

    /** 代理商资产解冻 */
    thawAgentAsset(params: { id: string; amount: string }): Promise<void> {
        return this.api.post('/agentAsset/thaw', params);
    }

    /** 代理商资产划转 */
    transferAgentAsset(params: {
        id?: string;
        coinId?: string;
        agentId?: string;
        cardNo?: string;
        remarks?: string;
        amount?: string;
    }): Promise<void> {
        return this.api.post('/agentAsset/agentTransfer', params);
    }

    // ─── 用户资产接口 ───────────────────────────────────────────────────────────

    /** 用户资产列表 */
    getUserAssetList(params: {
        userId?: string;
        coinId?: string;
        agentName?: string;
        startBalance?: string;
        endBalance?: string;
        startFrozenBalance?: string;
        endFrozenBalance?: string;
        startManualFrozenBalance?: string;
        endManualFrozenBalance?: string;
        startRiskFrozenBalance?: string;
        endRiskFrozenBalance?: string;
        showMinusAccount?: null | 1 | 2;
        labelId?: string | null;
        pageNo: number;
        pageSize: number;
    }): Promise<{ list: UserAssetItem[] } & TableResultType> {
        return this.api.post('/userAsset/newUserAssetList', params);
    }

    /** 用户资产汇总金额（需先选择币种才有意义） */
    getUserAssetAmountTotal(params: {
        coinId?: string;
        userId?: string;
        agentName?: string;
        startBalance?: string;
        endBalance?: string;
        startFrozenBalance?: string;
        endFrozenBalance?: string;
        startManualFrozenBalance?: string;
        endManualFrozenBalance?: string;
        startRiskFrozenBalance?: string;
        endRiskFrozenBalance?: string;
        showMinusAccount?: null | 1 | 2;
        pageNo: number;
        pageSize: number;
    }): Promise<UserAssetAmountTotal> {
        return this.api.post('/userAsset/getUserAssetListAmountTotal', params);
    }

    /** 导出用户资产列表 */
    exportUserAssetList(params: {
        userId?: string;
        coinId?: string;
        startBalance?: string;
        endBalance?: string;
        startFrozenBalance?: string;
        endFrozenBalance?: string;
        startManualFrozenBalance?: string;
        endManualFrozenBalance?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<Blob> {
        return this.api.post('/userAsset/userAssetList/excelWriter', params, {
            responseType: 'blob',
        });
    }

    /** 快照全部用户资产 */
    snapshotUserAsset(): Promise<void> {
        return this.api.get('/userAsset/snapshot');
    }

    /** 手动冻结用户资产 */
    freezeUserAsset(params: {
        assetId: number;
        balance?: string;
        amount?: string;
        manualFrozenBalance?: string;
        symbol?: string;
    }): Promise<void> {
        return this.api.post('/userAsset/manualFreeze', params);
    }

    /** 手动解冻用户资产 */
    unfreezeUserAsset(params: {
        assetId: number;
        balance?: string;
        amount?: string;
        symbol?: string;
    }): Promise<void> {
        return this.api.post('/userAsset/manualUnfreeze', params);
    }

    /** 修改用户资产负数展示状态 */
    updateUserAssetShowMinus(params: { id: string; showMinusAccount: 1 | 2 }): Promise<void> {
        return this.api.post('/userAsset/updateUserAssetStatus', params);
    }

    // ─── 用户资产流水接口 ────────────────────────────────────────────────────────

    /** 用户资产流水列表 */
    getUserAssetLogList(params: {
        accountId?: string;
        historyAgentName?: string;
        sourceOrderNo?: string;
        sourceType?: number | string | null;
        state?: number | null;
        startTime?: string;
        endTime?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<{ list: UserAssetLogItem[] } & TableResultType> {
        return this.api.post('/userAssetLog/list', params);
    }

    /** 导出用户资产流水 */
    exportUserAssetLogList(params: {
        accountId?: string;
        historyAgentName?: string;
        sourceOrderNo?: string;
        sourceType?: number | string | null;
        state?: number | null;
        startTime?: string;
        endTime?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<Blob> {
        return this.api.post('/userAssetLog/export', params, { responseType: 'blob' });
    }

    /** 用户资产流水动账类型列表 */
    getAssetLogTypeList(): Promise<AssetLogTypeItem[]> {
        return this.api.get('/userAssetLog/typeList');
    }

    // ─── 划转记录接口 ────────────────────────────────────────────────────────────

    /** 代理商资产划转记录列表 */
    getAgentTransferList(params: {
        agentId?: string;
        coinId?: string;
        startTime?: string;
        endTime?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<{ list: AgentAssetTransferItem[] } & TableResultType> {
        return this.api.get('/agentAsset/assetTransferList', { params });
    }

    /** 导出划转记录 */
    exportAgentTransferList(params: {
        agentId?: string;
        coinId?: string;
        startTime?: string;
        endTime?: string;
    }): Promise<Blob> {
        return this.api.get('/agentAsset/assetTransferList/excelWriter', {
            params,
            responseType: 'blob',
        });
    }

    // ─── 用户资产冻结表接口 ───────────────────────────────────────────────────────

    /** 用户资产冻结表列表 */
    getUserAssetFrozenList(params: AssetFrozenQueryParams): Promise<{ list: UserAssetFrozenItem[] } & TableResultType> {
        return this.api.get('/virtual/bill/userAssetFrozenList', { params });
    }

    /** 解冻用户资产（冻结表操作） */
    thawUserAssetManualFrozen(params: {
        id: string;
        amount: string;
        reason: string;
    }): Promise<void> {
        return this.api.post('/virtual/bill/thawManualFrozenBalance', params);
    }

    // ─── 用户资产冻结历史接口 ─────────────────────────────────────────────────────

    /** 用户资产冻结历史列表 */
    getUserAssetFrozenLogList(params: AssetFrozenQueryParams): Promise<{ list: UserAssetFrozenLogItem[] } & TableResultType> {
        return this.api.get('/virtual/bill/userAssetFrozenLogList', { params });
    }
}

export default new AssetApi();