/**
 * 将 Map 结构转换成 Select 可渲染的数组结构。
 * 可选 callback 允许调用方自定义映射规则。
 */
export function transMapBySelectOptions<T = any, U = any, R = any>(
    map: Map<T, U>,
    callback?: (key: T, value: U) => R,
): U[] | R[] {
    if (callback) {
        const result: R[] = []
        map.forEach((value, key) => {
            result.push(callback(key, value))
        })
        return result
    }

    return Array.from(map.values())
}

/**
 * 在下拉选项头部插入“全部”。
 */
export function unshiftSelectOptionAll<T = any>(options: T[]): void {
    options.unshift({ label: '全部', value: '' } as T)
}
