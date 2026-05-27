import { Api } from '@/api/api'
import type { Pagination } from '@/interface/type'

class ReferralApi extends Api {
    /** 邀请返佣列表 */
    getReferralList(params: {
        inviteAccountId?: string
        parentAccountId?: string
        uid?: string
        depositType?: number | string
        invitationCode: string
        cardDepositOrderNo: string
        pageNo: number
        pageSize: number
    }): Promise<
        {
            list: Array<{
                cardDepositOrderNo: string
                createTime: string
                depositAmount: string
                depositType: string
                ditchName?: string
                ditchId?: string
                earningAmount: string
                id: string
                invitationCode: string
                inviteAccountId: string
                parentAccountId: string
                accountCardNo?: string
                rebateRatio: string
            }>
        } & Pagination
    > {
        return this.api.get('/referral/referralList', { params })
    }

    /** 邀请返佣列表导出 */
    exportReferralList(params: {
        inviteAccountId?: string
        parentAccountId?: string
        uid?: string
        depositType?: number | string
        invitationCode: string
        cardDepositOrderNo: string
        pageNo: number
        pageSize: number
    }): Promise<Blob> {
        return this.api.get('/referral/excelWriterReferralList', { params, responseType: 'blob' })
    }

    /** 新增返佣配置 */
    createReferralConfig(params: {
        accountId?: string
        rangeType: 1 | 2
        scale: string
        scaleType: 1 | 2 | 3
    }): Promise<boolean> {
        return this.api.post('/referral/createReferralConfig', params)
    }

    /** 编辑返佣配置 */
    updateReferralConfig(params: {
        accountId?: string
        scale: string
        scaleType: 1 | 2 | 3
        id?: string
    }): Promise<boolean> {
        return this.api.post('/referral/updateReferralConfig', params)
    }

    /** 返佣配置列表 */
    getReferralConfigList(params: {
        scaleType: string | null
        rangeType: string | null
        accountId: number | string
        pageNo: number
        pageSize: number
    }): Promise<
        {
            list: Array<{
                accountId: string
                createTime: string
                id: string
                rangeType: string
                scale: string
                scaleType: string
            }>
        } & Pagination
    > {
        return this.api.get('/referral/referralConfigList', { params })
    }
}

export default new ReferralApi()
