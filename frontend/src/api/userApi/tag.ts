import { Api } from '@/api/api'
import type { TableResultType } from '@/interface/TableType'

class TagApi extends Api {
    /** 标签下拉 */
    getTagList(): Promise<Array<{ color: string; id: string; name: string }>> {
        return this.api.get('/tag/list')
    }

    /** 标签分页列表 */
    getTagPageList(params: {
        pageNo: number
        pageSize: number
        id: string
        name: string
        operatorName: string
    }): Promise<
        {
            list: {
                accountIds: string
                color: string
                createTime: string
                id: string
                name: string
                operatorName: string
                sort: number
                updateTime: string
            }[]
        } & TableResultType
    > {
        return this.api.get('/tag/pageList', { params })
    }

    /** 新增或编辑标签 */
    saveTag(params: {
        accountIds: string
        color: string
        createBy: string
        id: string
        name: string
        sort: number
    }): Promise<boolean> {
        return this.api.post('/tag/addOrUpdate', params)
    }

    /** 删除标签 */
    deleteTag(params: { id: string }): Promise<boolean> {
        return this.api.get('/tag/delete', { params })
    }

    /** 标签详情 */
    getTagInfo(params: { id: string }): Promise<{
        accountIds?: string
        color?: string
        id?: string
        name?: string
        sort?: number
    }> {
        return this.api.get('/tag/info', { params })
    }

    /** 导出标签 */
    exportTagList(params: { id: string; name: string; operatorName: string }): Promise<Blob> {
        return this.api.get('/tag/exportList', { params, responseType: 'blob' })
    }

    /** 下载标签导入模版 */
    getTagImportTemplate(): Promise<Blob> {
        return this.api.get('/tag/inPutTemplate', { responseType: 'blob' })
    }

    /** 标签导入时的账户下拉 */
    getTagAccountList(params?: { accountId?: string }): Promise<
        Array<{
            accountId?: string
            id?: string
            labelCount?: number
        }>
    > {
        return this.api.get('/tag/accountList', { params })
    }

    /** 标签导入 */
    importTag(params: { file: File }): Promise<
        | boolean
        | Array<{
              name?: string
              color?: string
              accountIds?: string
              failReason?: string
          }>
    > {
        return this.api.post('/tag/importTag', params, {
            headers: {
                Accept: 'application/json, text/plain',
                'Content-Type': 'multipart/form-data',
            },
        })
    }
}

export default new TagApi()
