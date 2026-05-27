/**
 * 用户法币资产 API 模块
 *
 * 对应后端 URL 前缀：/fiat/user/asset/
 *
 * 迁移自老项目 src/api/fiatUser/index.ts，
 * 只保留用户法币资产（/asset 模块第7、8页）所需接口。
 */
import type { TableResultType } from '@/interface/TableType';
import { Api } from '../api';

// ─── 用户法币资产列表项类型 ───────────────────────────────────────────────────────
export interface FiatUserAssetItem {
    id?: string;
    accountId?: string;       // 用户UID
    agentId?: string;         // 代理商ID
    agentName?: string;       // 代理商名称
    currency?: string;        // 资产类型（法币符号）
    balance?: string;         // 可用数量
    acquirerFrozen?: string;  // 收单待结算数量
    withdrawFrozen?: string;  // 提现冻结数量
    outlayBalance?: string;   // 代付余额
    outlayFrozen?: string;    // 代付待结算数量
    frozen?: string;          // 冻结总数量（已注释，保留字段兼容）
    status?: number | string; // 状态
    statusDesc?: string;      // 状态说明
    hash?: string;            // 账户hash
    createTime?: string;
    updateTime?: string;
}

// ─── 用户法币资产流水列表项类型 ───────────────────────────────────────────────────
export interface FiatUserAssetLogItem {
    id?: string;
    accountId?: string;             // 用户UID
    agentId?: string;               // 代理商ID
    agentName?: string;             // 代理商名称
    currency?: string;              // 动账币种
    amount?: string;                // 动账金额
    sourceOrderNo?: string;         // 动账订单号
    sourceType?: number | string;   // 动账类型
    sourceTypeDesc?: string;        // 动账类型说明
    state?: number | string;        // 状态
    stateDesc?: string;             // 状态说明
    reason?: string;                // 动账说明
    beforeBalance?: string;         // 可用期初金额
    afterBalance?: string;          // 可用期末金额
    beforeAcquirerFrozen?: string;  // 收单待结算期初金额
    afterAcquirerFrozen?: string;   // 收单待结算期末金额
    beforeWithdrawFrozen?: string;  // 提现冻结期初
    afterWithdrawFrozen?: string;   // 提现冻结期末
    beforeOutlayBalance?: string;   // 代付期初金额
    afterOutlayBalance?: string;    // 代付期末金额
    beforeOutlayFrozen?: string;    // 代付待结算期初金额
    afterOutlayFrozen?: string;     // 代付待结算期末金额
    beforeFrozen?: string;          // 动账前冻结金额（已注释，保留兼容）
    afterFrozen?: string;           // 动账后冻结金额（已注释，保留兼容）
    createTime?: string;            // 动账时间
    remarks?: string;               // 备注
    hash?: string;                  // 记录Hash
}

// ─── 法币币种选项类型 ─────────────────────────────────────────────────────────────
export interface FiatCoinOption {
    id?: string | number;
    name?: string;
    symbol?: string;
    label?: string;
    value?: string | number;
}

// ─── 动账类型选项类型 ─────────────────────────────────────────────────────────────
export interface FiatLogTypeOption {
    code: number | string;
    name: string;
}

class FiatUserAssetApi extends Api {
    constructor() {
        // Api 基类从环境变量读取 baseURL，无需传参
        super();
    }

    /** 用户法币资产列表 */
    getFiatUserAssetList(params: {
        accountId?: string | number;
        agentId?: string | number;
        agentName?: string;
        coinId?: string | number | null;
        createTimeStart?: string;
        createTimeEnd?: string;
        updateTimeStart?: string;
        updateTimeEnd?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<{ list: FiatUserAssetItem[] } & TableResultType> {
        return this.api.post('/fiat/user/asset/list', params);
    }

    /** 导出用户法币资产列表 */
    exportFiatUserAssetList(params: {
        accountId?: string | number;
        agentId?: string | number;
        agentName?: string;
        coinId?: string | number | null;
        createTimeStart?: string;
        createTimeEnd?: string;
        updateTimeStart?: string;
        updateTimeEnd?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<Blob> {
        return this.api.post('/fiat/user/asset/export', params, { responseType: 'blob' });
    }

    /** 用户法币资产流水列表 */
    getFiatUserAssetLogList(params: {
        accountId?: string | number;
        agentId?: string | number;
        agentName?: string;
        coinId?: string | number | null;
        sourceType?: number | string | null;
        createTimeStart?: string;
        createTimeEnd?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<{ list: FiatUserAssetLogItem[] } & TableResultType> {
        return this.api.post('/fiat/user/asset/log/list', params);
    }

    /** 导出用户法币资产流水 */
    exportFiatUserAssetLogList(params: {
        accountId?: string | number;
        agentId?: string | number;
        agentName?: string;
        coinId?: string | number | null;
        sourceType?: number | string | null;
        createTimeStart?: string;
        createTimeEnd?: string;
        pageNo: number;
        pageSize: number;
    }): Promise<Blob> {
        return this.api.post('/fiat/user/asset/log/export', params, { responseType: 'blob' });
    }

    /**
     * 法币动账类型列表（用于流水页搜索下拉选项）
     * 注意：老项目中实际调用的是 /log/sourceType/choose，
     * 这里保持相同路径，使用 this.api.get 走绝对路径。
     */
    getFiatUserAssetLogTypeList(): Promise<FiatLogTypeOption[]> {
        return this.api.get('/log/sourceType/choose');
    }

    /**
     * 法币币种下拉列表（用于法币资产页的资产类型搜索）
     * 老项目中来自 Acquiring API，URL 为 /fiat/coin/select。
     */
    getFiatCoinOptions(): Promise<FiatCoinOption[]> {
        return this.api.get('/fiat/coin/select');
    }
}

export default new FiatUserAssetApi();
