import { Api } from '@/api/api'

interface ApprovalFlowUser {
    checkUserName: string
}

interface EnterpriseTransferConfig {
    checkReqList: ApprovalFlowUser[]
}

class ExamineApi extends Api {
    getEnterpriseTransferConfig(params: {
        coinId: string
        amount: string
    }): Promise<EnterpriseTransferConfig[]> {
        return this.api.get('/examine/getEnterpriseTransferConfig', { params })
    }
}

export default new ExamineApi()
