import { Api } from './api';

interface EnterpriseTransferConfigParams {
    coinId: string;
    amount: string;
}

export interface ApprovalUser {
    checkUserName: string;
}

export interface ApprovalFlow {
    checkReqList: ApprovalUser[];
}

class ExamineApi extends Api {
    async getEnterpriseTransferConfig(
        params: EnterpriseTransferConfigParams,
    ): Promise<ApprovalFlow[]> {
        return this.api.get<ApprovalFlow[], ApprovalFlow[], EnterpriseTransferConfigParams>(
            '/enterprise-transfer/config',
            { params },
        );
    }
}

export default new ExamineApi();
