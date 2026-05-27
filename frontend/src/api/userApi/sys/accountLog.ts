import { Api } from '@/api/api'
import type { AccountLogData, AccountLogParams } from '@/api/userApi/types.d'
import type { Pagination } from '@/interface/type'

class SysAccountLogApi extends Api {
    /** 用户登录日志列表 */
    getAccountLogList(params: AccountLogParams): Promise<{ list: AccountLogData[] } & Pagination> {
        return this.api.post('/sys/accountLog/loginList', params)
    }

    /** 用户登录日志导出 */
    exportAccountLog(params: {
        deviceId: string
        accountId?: string
        browserLanguage?: string
        endTime: string
        hostName?: string
        ipAddress?: string
        macAddress?: string
        nationalNumber?: string
        offset?: string
        operated?: string
        pageNo?: number
        pageSize?: number
        platform?: number
        platformLanguage?: string
        startTime: string
        usernameCn?: string
        usernameEn?: string
        labelId?: string
    }): Promise<Blob> {
        return this.api.post('/sys/accountLog/export', params, { responseType: 'blob' })
    }
}

export default new SysAccountLogApi()
