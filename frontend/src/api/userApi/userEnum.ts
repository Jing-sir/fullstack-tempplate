type LabelMeta = {
    label: string
}

/**
 * 历史用户认证状态同时兼容数字态与风控字符串态。
 * 这里统一成联合类型，避免旧页面映射状态文案时出现类型分叉。
 */
export type subSumStatusEnum = 0 | 1 | 2 | 3 | 'WAIT' | 'GREEN' | 'RED'

export const userIdTypeMap = new Map<number, LabelMeta>([
    [1, { label: '身份证' }],
    [2, { label: '护照' }],
])

export const genderMap = new Map<number, LabelMeta>([
    [1, { label: '男' }],
    [2, { label: '女' }],
])

export const subSumStatusMap = new Map<subSumStatusEnum, LabelMeta>([
    [0, { label: '未认证' }],
    [1, { label: '认证中' }],
    [2, { label: '成功' }],
    [3, { label: '失败' }],
    ['WAIT', { label: '待处理' }],
    ['GREEN', { label: '成功' }],
    ['RED', { label: '失败' }],
])
