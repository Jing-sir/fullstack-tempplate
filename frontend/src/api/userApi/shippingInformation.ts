import { Api } from '@/api/api'
import type { Pagination } from '@/interface/type'

export interface ShippingInformationListParams {
    id?: string | null
    accountId?: string
    fullName?: string
    pageNo: number
    pageSize: number
}

export interface ShippingInformationItem {
    addressLine1: string
    addressLine2?: string
    id: string
    accountId?: string
    customerNo?: string
    city: string
    country: string
    province?: string
    createTime: string
    email: string
    fullName: string
    phone: string
    phoneArea: string
    postCode: string
}

class ShippingInformationApi extends Api {
    /** 收货信息列表 */
    getShippingInformationList(params: ShippingInformationListParams): Promise<{ list: ShippingInformationItem[] } & Pagination> {
        return this.api.get('/shippingInformation/list', { params })
    }

    /** 导出收货信息列表 */
    exportShippingInformationList(params: ShippingInformationListParams): Promise<Blob> {
        return this.api.get('/shippingInformation/export', { params, responseType: 'blob' })
    }
}

export default new ShippingInformationApi()
