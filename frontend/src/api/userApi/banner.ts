import { Api } from '@/api/api'
import type { Pagination } from '@/interface/type'

class BannerApi extends Api {
    /** 创建 Banner */
    createBanner(params: {
        accountId: string
        createTime: string
        rangeType: string
        scale: string
        scaleType: string
    }): Promise<boolean> {
        return this.api.post('/banner/add', params)
    }

    /** 删除 Banner */
    deleteBanner(id: number): Promise<boolean> {
        return this.api.get(`/banner/delete?id=${id}`)
    }

    /** 编辑 Banner */
    updateBanner(params: {
        accountId: string
        createTime: string
        id: string
        rangeType: string
        scale: string
        scaleType: string
    }): Promise<boolean> {
        return this.api.post('/banner/update', params)
    }

    /** Banner 列表 */
    getBannerList(params: {
        state: string | null
        pageNo: number
        pageSize: number
    }): Promise<
        {
            list: {
                language: string
                platform: string
                id: string
                state: string
                updateTime: string
                uri: string
                small: string
            }
        } & Pagination
    > {
        return this.api.post('/banner/list', params)
    }

    /** 更新 Banner 状态 */
    updateBannerState(params: {
        id: string
        state: 1 | 2 | ''
    }): Promise<boolean> {
        return this.api.get('/banner/updateState', { params })
    }
}

export default new BannerApi()
