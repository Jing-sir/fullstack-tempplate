import { Api } from '@/api/api'
import type { Pagination } from '@/interface/type'

class CardOpenFirstConfigApi extends Api {
    /** 新增首次开卡减免配置 */
    createCardOpenFirstConfig(params: {
        accountId: string
        beginTime: string
        endTime: string
        maxAmount: string
        minAmount: string
    }): Promise<boolean> {
        return this.api.post('/cardOpenFirstConfig/add', params)
    }

    /** 编辑首次开卡减免配置 */
    updateCardOpenFirstConfig(params: {
        accountId: string
        beginTime: string
        endTime: string
        maxAmount: string
        minAmount: string
        id: string
    }): Promise<boolean> {
        return this.api.post('/cardOpenFirstConfig/update', params)
    }

    /** 首次开卡减免列表 */
    getCardOpenFirstConfigList(params: {
        accountId?: string | null
        pageNo: number
        pageSize: number
    }): Promise<
        {
            list: {
                account: string
                accountId: string
                id: string
                beginTime: string
                createTime: string
                endTime: string
                maxAmount: string
                fullName: string
                minAmount: string
                updateTime: string
            }
        } & Pagination
    > {
        return this.api.get('/cardOpenFirstConfig/list', { params })
    }
}

export default new CardOpenFirstConfigApi()
