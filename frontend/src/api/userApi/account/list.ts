import { Api } from '@/api/api'
import type { AccountList, AccountParams } from '@/api/userApi/types.d'
import type { Pagination } from '@/interface/TableType'

/**
 * 注销申请列表查询参数。
 * 从 interface/type.ts 迁移至此处，与接口定义放在一起，职责更清晰。
 * 与 `/account/closeAccountList` 入参保持一致，避免迁移后筛选行为偏差。
 */
export interface CancellationApplicationType {
    pageNo: number
    pageSize: number
    accountId?: string
    userEmail?: string
    checkCloseState?: 1 | 2 | 3 | null
    state?: 1 | 2 | 3 | null
    startTime?: string
    endTime?: string
}

/**
 * 注销申请列表项。
 * 兼容老项目返回结构：核心展示字段显式声明，其它扩展字段继续允许透传。
 */
export interface CancellationApplicationItem extends Record<string, unknown> {
    id: string
    accountId?: string
    phone?: string
    globalCode?: string
    email?: string
    createTime?: string
    cancelTime?: string
    updateTime?: string
    closeAccountCheck?: 1 | 2 | 3 | ''
    state?: 1 | 2 | 3
}

export type CancellationApplicationList = CancellationApplicationItem[]

class AccountListApi extends Api {
    /** 代理商账户列表 */
    getAccountList(params: Partial<AccountParams>): Promise<{ list: AccountList[] } & Pagination> {
        return this.api.post('/account/list', params)
    }

    /** 导出代理商账户列表 */
    exportAccountList(params: Partial<AccountParams>): Promise<Blob> {
        return this.api.post('/account/accountExcelWriter', params, { responseType: 'blob' })
    }

    /** 更新账户状态 */
    updateAccountState(params: { id: string; state: 1 | 2 }): Promise<boolean> {
        return this.api.post('/account/updateState', params)
    }

    /** 重置登录密码 */
    resetAccountPassword(params: { id: string }): Promise<boolean> {
        return this.api.get('/account/resetPassword', { params })
    }

    /** 重置资金密码 */
    resetAccountPayPassword(params: { id: string }): Promise<boolean> {
        return this.api.get('/account/resetPayPassword', { params })
    }

    /** 注销申请列表 */
    getCancellationApplicationList(params: CancellationApplicationType): Promise<{ list: CancellationApplicationList } & Pagination> {
        return this.api.post('/account/closeAccountList', params)
    }

    /** 解绑邮箱 */
    updateCloseAccount(params: { id: string }): Promise<boolean> {
        return this.api.post('/account/updateCloseAccount', params)
    }
}

export default new AccountListApi()
