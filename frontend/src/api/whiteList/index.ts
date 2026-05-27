import { Api } from '@/api/api'
import type { Pagination } from '@/interface/type'

export interface WhitelistRow {
    id: string
    accountId: string
    businessType: string
    kycLevelRequired: number
    kycLevelMock: number
    kycLevel: number
    state: number
    labelList?: Array<{ id: string; name: string; color: string }>
    labelNames?: string
    createTime?: string
    updateTime?: string
}

interface WhitelistBus {
    id: string
    name: string
}

class WhiteListApi extends Api {
    /**
     * 用户认证等级白名单列表。
     */
    fetchWhitelistList(params: Record<string, unknown>): Promise<{ list: WhitelistRow[] } & Pagination> {
        return this.api.post('/kycWhite/list', params)
    }

    /**
     * 新增白名单。
     */
    fetchAddWhitelist(params: Record<string, unknown>): Promise<boolean> {
        return this.api.post('/kycWhite/add', params)
    }

    /**
     * 更新白名单。
     */
    fetchUpdateWhitelist(params: Record<string, unknown>): Promise<boolean> {
        return this.api.post('/kycWhite/update', params)
    }

    /**
     * 白名单业务类型下拉。
     */
    fetchWhitelistBusList(type = 1): Promise<WhitelistBus[]> {
        return this.api.get('/kycWhite/getBusinessList', { params: { type } })
    }

    /**
     * 根据 UID 查询邮箱，用于白名单新增校验。
     */
    fetchUidById(accountId: string, signal?: AbortSignal): Promise<string> {
        return this.api.get('/kycWhite/getEmailByAccountId', {
            params: { accountId },
            signal,
        })
    }

    /**
     * 启用/禁用白名单。
     */
    fetchUpdateState(params: Record<string, unknown>): Promise<boolean> {
        return this.api.post('/kycWhite/updateState', params)
    }

    /**
     * 兼容历史拼写错误方法名，避免旧调用点在渐进迁移阶段直接中断。
     */
    fetchPpdateState(params: Record<string, unknown>): Promise<boolean> {
        return this.fetchUpdateState(params)
    }
}

export default new WhiteListApi()
