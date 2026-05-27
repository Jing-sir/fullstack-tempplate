interface CountryOptionSource {
    nameZh?: unknown
    alpha3?: unknown
}

interface TagOptionSource {
    id?: unknown
    name?: unknown
}

/**
 * 国家下拉映射：
 * - label 优先中文名，其次 alpha3
 * - value 固定为 alpha3 字符串，便于接口筛选参数透传
 */
export const toCountryAlpha3Options = (
    list: CountryOptionSource[] = [],
): Array<{ label: string; value: string }> =>
    list.map((item) => ({
        label: String(item.nameZh ?? item.alpha3 ?? '--'),
        value: String(item.alpha3 ?? ''),
    }))

/**
 * 标签下拉映射：
 * - 统一转成 { label, value } 结构
 * - value 固定字符串，避免不同页面对 id 类型处理不一致
 */
export const toTagSelectOptions = (
    list: TagOptionSource[] = [],
): Array<{ label: string; value: string }> =>
    list.map((item) => ({
        label: String(item.name ?? ''),
        value: String(item.id ?? ''),
    }))
