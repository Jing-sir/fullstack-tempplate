import { Api } from '@/api/api'

class AccountCardApi extends Api {
    /** 手动充值 */
    createAccountCardManualDeposit(params: { cardDepositId: string }): Promise<boolean> {
        return this.api.post('/accountCard/manualDeposit', params)
    }

    /** 手动开卡 */
    createAccountCardManualOpenCard(params: {
        accountId: string
        amount: string
        cardNo: string
        coinId: string
        cvv2: string
        ditchCardId: string
        invalidTime: string
        receiptAmount: string
    }): Promise<boolean> {
        return this.api.post('/accountCard/manualOpenCard', params)
    }
}

export default new AccountCardApi()
