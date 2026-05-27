import { Api } from '@/api/api'
import type {
    EntrustDealDetailItem,
    EntrustDealDetailQuery,
    EntrustHistoryItem,
    EntrustHistoryQuery,
    EntrustPendingItem,
    EntrustQueryBase,
    EntrustStatistics,
    ExternalTradeLimit,
    FlashOption,
    FlashPagedResult,
    RateOrLimitQuery,
    SaveSwapConfigResult,
    SaveSwapLimitPayload,
    SaveSwapRatePayload,
    SaveTradePairPayload,
    SwapLimitItem,
    SwapRateItem,
    TradePairItem,
    TradePairQuery,
} from '@/api/flashExchange/types'

/**
 * 闪兑模块接口聚合。
 *
 * 说明：
 * 1. 保持老项目 endpoint 与参数语义，降低迁移行为偏差风险
 * 2. 页面层只依赖本模块，不再直接散落请求路径
 */
class FlashExchangeApi extends Api {
    // ── 交易对管理 ──────────────────────────────────────────

    /** 交易对分页列表 */
    getTradePairPage(params: {
        pageNo: number
        pageSize: number
    } & TradePairQuery): Promise<FlashPagedResult<TradePairItem>> {
        return this.api.post('/swapTrade/getPage', params)
    }

    /** 交易对下拉（内部交易对） */
    getTradeOptions(): Promise<FlashOption[]> {
        return this.api.get('/swapTrade/getTrade')
    }

    /** 交易对下拉（外部交易对） */
    getExternalTradeOptions(): Promise<FlashOption[]> {
        return this.api.get('/swapTrade/getExternalTrade')
    }

    /** 获取可选排序值 */
    getTradeSortOptions(params: { id?: string }): Promise<FlashOption[]> {
        return this.api.get('/swapTrade/getSort', { params })
    }

    /** 新增/编辑交易对 */
    saveTradePair(params: SaveTradePairPayload): Promise<boolean> {
        return this.api.post('/swapTrade/edit', params)
    }

    // ── 费率管理 ────────────────────────────────────────────

    /** 费率分页列表 */
    getSwapRatePage(params: {
        pageNo: number
        pageSize: number
    } & RateOrLimitQuery): Promise<FlashPagedResult<SwapRateItem>> {
        return this.api.post('/swapRate/getPage', params)
    }

    /** 新增/编辑费率 */
    saveSwapRate(params: SaveSwapRatePayload): Promise<SaveSwapConfigResult> {
        return this.api.post('/swapRate/edit', params)
    }

    /** 删除费率 */
    deleteSwapRate(params: { id: string }): Promise<boolean> {
        return this.api.post('/swapRate/delete', params)
    }

    // ── 交易限额限次 ────────────────────────────────────────

    /** 交易限额限次分页列表 */
    getSwapLimitPage(params: {
        pageNo: number
        pageSize: number
    } & RateOrLimitQuery): Promise<FlashPagedResult<SwapLimitItem>> {
        return this.api.post('/swapLimit/getPage', params)
    }

    /** 新增/编辑交易限额限次 */
    saveSwapLimit(params: SaveSwapLimitPayload): Promise<SaveSwapConfigResult> {
        return this.api.post('/swapLimit/edit', params)
    }

    /** 查询外部交易对渠道限制区间 */
    getExternalTradeLimit(params: { id: string }): Promise<ExternalTradeLimit> {
        return this.api.post('/swapLimit/getExternalTradeLimit', params)
    }

    /** 删除交易限额限次 */
    deleteSwapLimit(params: { id: string }): Promise<boolean> {
        return this.api.post('/swapLimit/delete', params)
    }

    // ── 订单管理：委托中 ─────────────────────────────────────

    /** 委托中订单分页列表 */
    getEntrustPendingPage(params: {
        pageNo: number
        pageSize: number
    } & EntrustQueryBase): Promise<FlashPagedResult<EntrustPendingItem>> {
        return this.api.post('/swapEntrust/getPageToEntrust', params)
    }

    /** 委托中订单统计 */
    getEntrustPendingStatistics(params: {
        pageNo: number
        pageSize: number
    } & EntrustQueryBase): Promise<EntrustStatistics> {
        return this.api.post('/swapEntrust/getStatisticsToEntrust', params)
    }

    /** 委托中订单导出 */
    exportEntrustPending(params: {
        pageNo: number
        pageSize: number
    } & EntrustQueryBase): Promise<Blob> {
        return this.api.post('/swapEntrust/exportToEntrust', params, { responseType: 'blob' })
    }

    // ── 订单管理：历史委托 ───────────────────────────────────

    /** 历史委托订单分页列表 */
    getEntrustHistoryPage(params: {
        pageNo: number
        pageSize: number
    } & EntrustHistoryQuery): Promise<FlashPagedResult<EntrustHistoryItem>> {
        return this.api.post('/swapEntrust/getPageToEntrustHistory', params)
    }

    /** 历史委托订单统计 */
    getEntrustHistoryStatistics(params: {
        pageNo: number
        pageSize: number
    } & EntrustHistoryQuery): Promise<EntrustStatistics> {
        return this.api.post('/swapEntrust/getStatisticsToEntrustHistory', params)
    }

    /** 历史委托订单导出 */
    exportEntrustHistory(params: {
        pageNo: number
        pageSize: number
    } & EntrustHistoryQuery): Promise<Blob> {
        return this.api.post('/swapEntrust/exportToEntrustHistory', params, { responseType: 'blob' })
    }

    // ── 订单管理：成交详情 ───────────────────────────────────

    /** 成交详情分页列表 */
    getEntrustDealDetailPage(params: {
        pageNo: number
        pageSize: number
    } & EntrustDealDetailQuery): Promise<FlashPagedResult<EntrustDealDetailItem>> {
        return this.api.post('/swapEntrust/getPageToEntrustDealDetail', params)
    }

    /** 成交详情统计 */
    getEntrustDealDetailStatistics(params: {
        pageNo: number
        pageSize: number
    } & EntrustDealDetailQuery): Promise<EntrustStatistics> {
        return this.api.post('/swapEntrust/getStatisticsToEntrustDealDetail', params)
    }

    /** 成交详情导出 */
    exportEntrustDealDetail(params: {
        pageNo: number
        pageSize: number
    } & EntrustDealDetailQuery): Promise<Blob> {
        return this.api.post('/swapEntrust/exportToEntrustDealDetail', params, { responseType: 'blob' })
    }

    // ── 订单管理：筛选项 ─────────────────────────────────────

    /** 币种下拉 */
    getEntrustCurrencyOptions(): Promise<FlashOption[]> {
        return this.api.get('/swapEntrust/getCurrency')
    }

    /** 委托类型下拉 */
    getEntrustTypeOptions(): Promise<FlashOption[]> {
        return this.api.get('/swapEntrust/getEntrustType')
    }

    /** 有效期下拉 */
    getEntrustValidPeriodOptions(): Promise<FlashOption[]> {
        return this.api.get('/swapEntrust/getValidPeriod')
    }

    /** 订单状态下拉 */
    getEntrustOrderStatusOptions(): Promise<FlashOption[]> {
        return this.api.get('/swapEntrust/getOrderStatus')
    }

    /** 取消委托中订单 */
    cancelEntrustOrder(params: { id: string; password: string }): Promise<boolean> {
        return this.api.post('/swapEntrust/cancel', params)
    }
}

export default new FlashExchangeApi()

export type {
    EntrustDealDetailItem,
    EntrustDealDetailQuery,
    EntrustHistoryItem,
    EntrustHistoryQuery,
    EntrustPendingItem,
    EntrustQueryBase,
    EntrustStatistics,
    ExternalTradeLimit,
    FlashOption,
    FlashPagedResult,
    RateOrLimitQuery,
    SaveSwapConfigResult,
    SaveSwapLimitPayload,
    SaveSwapRatePayload,
    SaveTradePairPayload,
    SwapLimitItem,
    SwapRateItem,
    TradePairItem,
    TradePairQuery,
} from '@/api/flashExchange/types'

