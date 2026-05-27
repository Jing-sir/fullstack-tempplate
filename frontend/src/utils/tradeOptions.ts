import flashExchangeApi from '@/api/flashExchange'
import type { FlashOption } from '@/api/flashExchange'

/**
 * 交易对下拉清洗：
 * - 对 label 做 trim，过滤掉 label 为空或 value 为空值的无效项
 * value 类型为 string | number，用 != null 同时排除 null/undefined，
 * 再单独排除空字符串，保留 0 等合法数值。
 */
export const sanitizeTradeOptions = (options: FlashOption[] = []): FlashOption[] =>
    options
        .map((item) => ({ ...item, label: String(item.label || '').trim() }))
        .filter((item) => item.label && item.value != null && item.value !== '')

/**
 * 统一交易对下拉拉取策略：
 * 优先内部接口，返回空数组或请求失败时自动回退到外部接口。
 *
 * 用 Promise 链实现 fallback，避免嵌套 try-catch：
 * - catchFallback：捕获内部接口异常，返回 [] 触发后续 fallback 判断
 * - thenFallback：内部接口成功但无数据时，同样触发外部接口
 * - 两路都失败时，外部接口的错误会自然向上抛出
 */
export const fetchTradeOptions = (): Promise<FlashOption[]> => {
    // 内部接口失败时静默降级，返回空数组以触发 fallback
    const internalRequest = flashExchangeApi
        .getTradeOptions()
        .then(sanitizeTradeOptions)
        .catch(() => [] as FlashOption[])

    // 外部接口作为兜底，按需延迟发起
    const fallbackToExternal = () =>
        flashExchangeApi.getExternalTradeOptions().then(sanitizeTradeOptions)

    return internalRequest.then((options) => (options.length ? options : fallbackToExternal()))
}

/**
 * 交易对展示文案统一补齐：
 * - 后端若已返回 BTC/USDT 这类完整交易对，原样展示
 * - 若只返回 BTC，则补成 BTC/USDT
 *
 * 注：此函数属于展示层格式化，调用方在模板/渲染层使用。
 */
export const formatTradeOptionLabel = (item: FlashOption): string => {
    const labelText = String(item.label || '')
    return labelText.includes('/') ? labelText : `${labelText}/USDT`
}
