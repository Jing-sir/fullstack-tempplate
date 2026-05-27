import { Api } from '@/api/api'
import type { OperationLogRow } from '@/interface/SystemManageType'

/**
 * /sys 操作日志相关接口。
 */
class SysOperationLogApi extends Api {
    /** 操作日志列表 */
    fetchOperationLogList(params: {
        pageNo: number
        pageSize: number
        opAccount: string
        reqFunc: string
        startTime?: string
        endTime?: string
    }): Promise<{
        list: OperationLogRow[]
        pageNo: number
        pageSize: number
        totalPages: number
        totalSize: number
    }> {
        return this.api.get('/sys/operationLog/list', { params })
    }
}

export default new SysOperationLogApi()
