import { Api } from '@/api/api'
import type { TableResultType } from '@/interface/TableType'

export interface ExampleItem {
    id: string
    uid: string
    name: string
    state: 1 | 2
    createTime?: string
}

export interface ExampleListParams {
    pageNo: number
    pageSize: number
    name?: string
    state?: number | null
}

export interface SaveExampleParams {
    id?: string
    name: string
    state: 1 | 2
}

class ExampleApi extends Api {
    /** 示例列表 */
    getList(params: ExampleListParams): Promise<{ list: ExampleItem[] } & TableResultType> {
        return this.api.get('/example/pageList', { params })
    }

    /** 示例导出 */
    exportList(params: ExampleListParams): Promise<Blob> {
        return this.api.get('/example/export', { params, responseType: 'blob' })
    }

    /** 新增或编辑示例 */
    saveItem(params: SaveExampleParams): Promise<boolean> {
        return this.api.post('/example/save', params)
    }

    /** 删除示例 */
    deleteItem(params: { id: string }): Promise<boolean> {
        return this.api.get('/example/delete', { params })
    }
}

export default new ExampleApi()
