import type { TableFetchResponse, TableFetchResult } from '@/interface/TableType'

interface BuildTableFetchResultOptions<
    TRecord = Record<string, unknown>,
    TResponse = unknown,
    TParams = unknown,
> {
    response: TResponse
    params?: TParams
    list?: TRecord[]
    pageNoKeys?: string[]
    pageSizeKeys?: string[]
    totalKeys?: string[]
}

const DEFAULT_PAGE_NO_KEYS = ['pageNo', 'pageNum']
const DEFAULT_PAGE_SIZE_KEYS = ['pageSize']
const DEFAULT_TOTAL_KEYS = ['totalSize', 'total', 'totalCount']

const toRecord = (source: unknown): Record<string, unknown> => {
    if (source && typeof source === 'object') {
        return source as Record<string, unknown>
    }

    return {}
}

/**
 * 从多个候选字段中提取数字值：
 * - 优先读取接口返回
 * - 未命中时回退到请求参数
 * - 仍为空时使用默认值
 */
const pickNumber = (
    source: Record<string, unknown>,
    fallbackSource: Record<string, unknown> | undefined,
    keyList: string[],
    defaultValue: number,
): number => {
    for (const key of keyList) {
        const sourceValue = source[key]
        if (Number.isFinite(Number(sourceValue))) {
            return Number(sourceValue)
        }

        const fallbackValue = fallbackSource?.[key]
        if (Number.isFinite(Number(fallbackValue))) {
            return Number(fallbackValue)
        }
    }

    return defaultValue
}

/**
 * 列表接口分页结果标准化：
 * 把 pageNo/pageNum、total/totalSize 等历史差异统一折叠成 TableSearchWrap 可消费结构。
 */
export const buildTableFetchResult = <TRecord = Record<string, unknown>>(
    options: BuildTableFetchResultOptions<TRecord>,
): TableFetchResult<TRecord> => {
    const {
        response,
        params,
        list,
        pageNoKeys = DEFAULT_PAGE_NO_KEYS,
        pageSizeKeys = DEFAULT_PAGE_SIZE_KEYS,
        totalKeys = DEFAULT_TOTAL_KEYS,
    } = options
    const responseRecord = toRecord(response)
    const paramsRecord = toRecord(params)

    return {
        list: Array.isArray(list)
            ? list
            : (Array.isArray(responseRecord.list) ? responseRecord.list : []) as TRecord[],
        pageNo: pickNumber(responseRecord, paramsRecord, pageNoKeys, 1),
        pageSize: pickNumber(responseRecord, paramsRecord, pageSizeKeys, 20),
        totalSize: pickNumber(responseRecord, paramsRecord, totalKeys, 0),
    }
}

/**
 * 把页面侧 `apiFetch` 的多种返回形态统一标准化为 TableSearchWrap 可消费结果：
 * 1) 纯数组 -> 自动补齐分页壳，适配“后端返回全量列表”接口
 * 2) 对象结果 -> 复用 buildTableFetchResult 做字段兼容折叠
 * 3) 对象未提供 total* 但有 list 时 -> totalSize 兜底为 list.length
 */
export const normalizeTableFetchResult = <TRecord = Record<string, unknown>>(
    response: TableFetchResponse<TRecord>,
    params?: Record<string, unknown>,
): TableFetchResult<TRecord> => {
    const paramsRecord = toRecord(params)

    if (Array.isArray(response)) {
        const pageNo = pickNumber({}, paramsRecord, DEFAULT_PAGE_NO_KEYS, 1)
        const pageSizeFromParams = pickNumber(
            {},
            paramsRecord,
            DEFAULT_PAGE_SIZE_KEYS,
            response.length || 20,
        )

        return {
            list: response,
            pageNo,
            pageSize: response.length || pageSizeFromParams,
            totalSize: response.length,
        }
    }

    const normalized = buildTableFetchResult<TRecord>({
        response,
        params,
    })
    const responseRecord = toRecord(response)
    const hasExplicitTotal = DEFAULT_TOTAL_KEYS.some((key) =>
        Number.isFinite(Number(responseRecord[key])),
    )

    if (!hasExplicitTotal && normalized.totalSize === 0 && normalized.list.length > 0) {
        return {
            ...normalized,
            totalSize: normalized.list.length,
        }
    }

    return normalized
}
