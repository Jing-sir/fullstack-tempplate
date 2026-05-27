type Translate = (message: string) => string

/**
 * 闪兑范围类型文案：
 * - 1 => 全局
 * - 2 => 用户标签
 * - 3 => 用户
 */
export const getFlashLimitRangeText = (value: unknown, t: Translate): string => {
    if (Number(value) === 1) return t('全局')
    if (Number(value) === 2) return t('用户标签')
    if (Number(value) === 3) return t('用户')
    return '--'
}
