export interface LabelTagOption {
    id: string | number
    name: string
    color: string
}

export interface LabelTagItem {
    id: string
    name: string
    color: string
}

/**
 * 把逗号分隔的标签 ID 串解析成 TableSearchWrap `labelTags` 可直接消费的结构。
 * - 输入支持 string/number/null/undefined
 * - 若找不到标签元数据，回退为「ID 原文 + 默认颜色」
 */
export const resolveLabelTagList = (
    value: unknown,
    optionList: LabelTagOption[],
): LabelTagItem[] => {
    const optionMap = new Map<string, LabelTagOption>(
        optionList.map((item) => [String(item.id), item]),
    )

    const idList = String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

    return idList.map((id) => {
        const target = optionMap.get(id)
        return {
            id,
            name: target?.name || id,
            color: target?.color || 'arcoblue',
        }
    })
}
