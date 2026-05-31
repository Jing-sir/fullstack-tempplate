import { Api } from '../api';
import type { OperationLogRow } from '@/interface/SystemManageType';
import { buildTableFetchResult } from '@/utils/table';

export interface OperationLogListParams {
    opAccount?: string;
    reqFunc?: string;
    startTime?: string;
    endTime?: string;
    pageNo?: number;
    pageSize?: number;
}

interface OperationLogListResponse {
    list: OperationLogRow[];
    total: number;
}

class SysOperationLogApi extends Api {
    async fetchOperationLogList(params: OperationLogListParams) {
        const result = await this.api.get<OperationLogListResponse, OperationLogListResponse>(
            '/operation-logs',
            { params },
        );
        return buildTableFetchResult<OperationLogRow>({
            response: result,
            params,
            totalKeys: ['total'],
        });
    }
}

export default new SysOperationLogApi();
