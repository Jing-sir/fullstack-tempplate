import { Api } from './api'
import axios from 'axios'
import type { AxiosProgressEvent } from 'axios'

/**
 * file.ts — /file/* 前缀的文件上传接口模块。
 *
 * 原存放于 fetchTest/index.ts，迁移至此以符合"接口按 URL 前缀归档"的目录规则。
 */
class FileApi extends Api {
    /**
     * 上传文件/图片（不带进度回调）。
     * fileType: 1 = 卡片
     */
    uploadFile(params: { file: unknown; fileType: unknown }): Promise<{
        fullUrl: string
        uri: string
    }> {
        return this.api.post('/file/upload', params, {
            headers: { Accept: 'application/json, text/plain' },
        })
    }

    /**
     * 上传 Banner 图（带平台区分）。
     * platform: 1 = APP，2 = Web
     */
    uploadBanner(params: {
        file: unknown
        fileType: unknown
        platform: 1 | 2
    }): Promise<{
        fullUrl: string
        uri: string
    }> {
        return this.api.post('/file/uploadBanner', params, {
            headers: { Accept: 'application/json, text/plain' },
        })
    }

    /**
     * 上传文件（带进度回调 + 取消令牌）。
     * 返回 { promise, cancel }，调用方可通过 cancel() 中断上传。
     */
    userUploadFile(
        params: { file: unknown; fileType: unknown },
        onUploadProgress: (event: AxiosProgressEvent) => void,
    ): {
        promise: Promise<{ fullUrl: string; uri: string }>
        cancel: () => void
    } {
        const cancelTokenSource = axios.CancelToken.source()

        return {
            promise: this.api.post('/file/upload', params, {
                headers: { Accept: 'application/json, text/plain' },
                onUploadProgress,
                cancelToken: cancelTokenSource.token,
            }),
            cancel: cancelTokenSource.cancel,
        }
    }
}

export default new FileApi()