import { Api } from '@/api/api'

class TransactionApi extends Api {
    /** 设置交易密码 */
    setTransactionTradePassword(params: {
        againTradePwd: string
        newTradePwd: string
        walletSiteId: string | null
    }): Promise<boolean> {
        return this.api.post('/transaction/setTradePwd', params)
    }

    /** 修改交易密码 */
    updateTransactionPaymentPassword(params: {
        againTradePwd: string
        newTradePwd: string
        oldTradePwd: string
    }): Promise<boolean> {
        return this.api.post('/transaction/updatePaymentPwd', params)
    }

    /** 重置交易密码 */
    resetTransactionPaymentPassword(params: {
        againTradePwd: string
        newTradePwd: string
        walletSiteId: string | null
    }): Promise<boolean> {
        return this.api.post('/transaction/resetPaymentPwd', params)
    }
}

export default new TransactionApi()
