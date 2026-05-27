import { Api } from '@/api/api'
import type { IUserAuthInfo, authenticationInfo } from '@/api/userApi/types.d'
import { genderMap, subSumStatusMap } from '@/api/userApi/userEnum'
import type { Pagination } from '@/interface/type'

interface AuthInfoResponse {
    authRemark: string
    authState: 0 | 1 | 2 | 3
    backUri: string
    birthDate: string
    certificateNo: string
    certificateType: 1 | 2
    frontUri: string
    gender: 1 | 2
    handheldUri: string
    name: string
    surname: string
}

interface AdvancedAuthInfoResponse {
    advancedCode: string
    advancedUrl: 0 | 1 | 2 | 3
}

interface UserAuthListItem extends IUserAuthInfo {
    genderName?: string
    documentTypeName?: string
    reviewStatusName?: string
    primaryStatusName?: string
}

class AccountAuthApi extends Api {
    /** 基础认证详情 */
    getAuthInfo(params: { id: string | undefined }): Promise<AuthInfoResponse> {
        return this.api.get('/account/authInfo', { params })
    }

    /** 高级认证详情 */
    getAdvancedAuthInfo(params: { id: string | undefined }): Promise<AdvancedAuthInfoResponse> {
        return this.api.get('/account/authAdvancedInfo', { params })
    }

    /** 基础认证审核 */
    updateAuthInfo(params: {
        id: string | undefined
        authRemark: string
        state: 1 | 2
    }): Promise<boolean> {
        return this.api.post('/account/auth', params)
    }

    /** 高级认证审核 */
    updateAdvancedAuthInfo(params: {
        id: string | undefined
        authRemark: string
        state: 1 | 2
    }): Promise<boolean> {
        return this.api.post('/account/authAdvanced', params)
    }

    /** 认证列表（附带状态文案映射） */
    getUserAuthList(params: Record<string, any>): Promise<{ list: UserAuthListItem[] } & Pagination> {
        return this.api.post('/account/authenticationList', params).then((result: any) => {
            const response = result as { list: UserAuthListItem[] } & Pagination
            response.list.forEach((item) => {
                item.genderName = genderMap.get(item.gender)?.label
                item.primaryStatusName = subSumStatusMap.get(item.primaryStatus)?.label
                item.reviewStatusName = subSumStatusMap.get(item.reviewStatus)?.label
            })
            return response
        })
    }

    /** 认证详情 */
    getUserAuthDetail(params: Record<string, any>): Promise<authenticationInfo> {
        return this.api.get('/account/authenticationInfo', { params })
    }

    /** 设置用户认证等级 */
    setUserAuthLevel(params: Record<string, any>): Promise<boolean> {
        return this.api.get('/account/updateAuthLevel', { params })
    }

    /** 查询认证等级配置 */
    getUserAuthLevel(): Promise<Record<string, any>> {
        return this.api.get('/account/authLevel')
    }

    /** 查询国家配置 */
    getUapyCountryList(): Promise<Record<string, any>[]> {
        return this.api.get('/account/uapyCountryList')
    }
}

export default new AccountAuthApi()
