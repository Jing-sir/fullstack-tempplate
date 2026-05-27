import type { Pagination } from '@/interface/TableType'

/**
 * 通用下拉项结构。
 * 闪兑模块的大部分下拉接口都返回 label/value 对。
 */
export interface FlashOption {
    label: string
    value: string | number
}

/**
 * 交易对管理查询参数。
 */
export interface TradePairQuery {
    limitPriceBuySwitch: number | ''
    limitPriceSellSwitch: number | ''
    marketPriceBuySwitch: number | ''
    marketPriceSellSwitch: number | ''
    marketShow: number | ''
    status: number | ''
    tradeId?: string | '' | null
    transactionShow: number | ''
}

/**
 * 交易对列表项。
 */
export interface TradePairItem extends TradePairQuery {
    coinFormSymbol: string
    coinFromId: string
    coinToId: string
    coinToSymbol: string
    countPrecision: number
    createTime: string
    id: string
    marketPriceRate: string
    pricePrecision: number
    quotaPrecision: number
    sort: number
    tradeName: string
    updateTime: string
}

/**
 * 交易对新增/编辑入参。
 */
export interface SaveTradePairPayload extends TradePairQuery {
    countPrecision: number | ''
    id?: string
    marketPriceRate: number | ''
    pricePrecision: number | ''
    quotaPrecision: number | ''
    sort?: number
}

/**
 * 费率/限额公共筛选参数。
 */
export interface RateOrLimitQuery {
    limitRange: 1 | 2 | 3 | ''
    status: 1 | 2 | ''
    tradeId?: string
}

/**
 * 费率列表项。
 */
export interface SwapRateItem extends RateOrLimitQuery {
    createTime: string
    id: string
    limitValue: string
    limitValueName: string
    maker: string
    taker: string
    tradeName: string
    updateTime: string
    tradeStatus: number
    rebateRangeValue?: string
}

/**
 * 费率新增/编辑入参。
 */
export interface SaveSwapRatePayload extends RateOrLimitQuery {
    id: string
    limitValue?: string | string[]
    maker: number | ''
    taker: number | ''
}

/**
 * 限额/费率新增返回结构。
 *
 * 当 result=false 时，前端需要弹失败提醒，并展示以下三类数据：
 * 1. alreadySet*：已存在配置，不可重复新增
 * 2. error*：输入值不存在
 * 3. notSet*：可继续新增
 */
export interface SaveSwapConfigResult {
    alreadySetLimitValue: string[]
    errorLimitValue: string[]
    notSetLimitValue: string[]
    alreadyUserSetLimitValue: string[]
    errorUserLimitValue: string[]
    notSetUserLimitValue: string[]
    result: boolean
}

/**
 * 交易限额限次列表项。
 */
export interface SwapLimitItem extends RateOrLimitQuery {
    amountLimitMax: string
    amountLimitMin: string
    createTime: string
    id: string
    limitValue?: string
    limitValueName: string
    maxBuyRate: string
    maxSellRate: string
    minBuyRate: string
    minSellRate: string
    priceLimitMax: string
    priceLimitMin: string
    tradeLimitDay?: number
    tradeLimitHour?: number
    tradeName: string
    updateTime: string
    tradeStatus?: number
}

/**
 * 外部交易对渠道最小/最大数量限制。
 */
export interface ExternalTradeLimit {
    minTrade: string
    maxTrade: string
}

/**
 * 限额新增/编辑入参。
 */
export type SaveSwapLimitPayload = Omit<SwapLimitItem, 'updateTime' | 'createTime' | 'limitValueName'>

/**
 * 委托订单筛选参数（委托中 / 历史 / 成交详情共用基线）。
 */
export interface EntrustQueryBase {
    accountId: string
    accountLabelId: string
    endTimeBegin: string
    endTimeEnd: string
    gainCurrency: string
    orderNo: string
    orderTimeBegin: string
    orderTimeEnd: string
    tradeId: string
    type?: string | number
    sellCurrency: string
    platformFeeCurrency: string
    validPeriod: string
    orderStatus: string | number
    agentName?: string
    historyAgentName?: string
}

/**
 * 委托中订单列表项。
 */
export type EntrustPendingItem = Omit<
    EntrustQueryBase,
    'orderTimeBegin' | 'orderTimeEnd' | 'endTimeBegin' | 'endTimeEnd'
> & {
    accountLabel: string
    accountLabelColor: string
    createTime: string
    ditchFee: string
    ditchFeeCurrency: string
    endTime: string
    estimateFee: string
    estimateFeeCurrency: string
    exchangeAfterCurrency: string
    exchangeAfterPrice: string
    exchangeBeforeCurrency: string
    exchangeBeforePrice: string
    exchangePrice: string
    gainNum: string
    id: string
    orderNo: string
    orderTime: string
    platformFee: string
    platformFeeCurrency: string
    realGainNum: string
    realSellNum: string
    sellCurrency: string
    sellNum: string
    tradeId: string
    tradeName: string
    type?: number
    typeName: string
    validPeriod: number
    validPeriodName: string
    entrustStatus?: number
    entrustStatusName?: string
    labelList?: Array<{ id: string; name: string; color: string }>
    labelNames?: string
}

/**
 * 历史委托筛选参数。
 */
export interface EntrustHistoryQuery extends EntrustQueryBase {
    refundCurrency: string
}

/**
 * 历史委托列表项。
 */
export interface EntrustHistoryItem extends EntrustPendingItem {
    dealAvgPrice: string
    dealTime: string
    orderStatusName: string
    orderStatus: string | number
    refundNum: string
    refundCurrency?: string
}

/**
 * 成交详情筛选参数。
 */
export interface EntrustDealDetailQuery extends EntrustQueryBase {
    dealTimeBegin: string
    dealTimeEnd: string
    detailOrderNo: string
}

/**
 * 成交详情列表项。
 */
export interface EntrustDealDetailItem extends EntrustPendingItem {
    dealAvgPrice: string
    dealTime: string
    detailOrderNo: string
    gainCurrency: string
    gainNum: string
}

/**
 * 订单统计汇总。
 */
export interface EntrustStatistics {
    ditchFeeTotal: string
    gainNumTotal: string
    platformFeeTotal: string
    realGainNumTotal: string
    realSellNumTotal: string
    sellNumTotal: string
    refundNumTotal?: string
}

/**
 * 闪兑模块统一分页结构。
 */
export type FlashPagedResult<T> = { list: T[] } & Pagination
