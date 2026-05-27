import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    CancelTokenSource,
    Canceler,
    InternalAxiosRequestConfig,
} from 'axios'

import http from 'axios' /// doc: https://github.com/axios/axios#axios-api
import { Message } from '@arco-design/web-vue'
import { getI18nLanguage } from '@/setup/i18n-setup'
import router from '../setup/router-setup'
import { timeStampToDate } from '@/filters/dateFormat'
import { clearManageToken, createTraceId, getManageToken } from '@/utils/session'

export type { AxiosInstance }

export enum AcceptType {
    Json = 'application/json',
    Plain = 'text/plain',
    Multipart = 'multipart/form-data',
    stream = 'application/json, text/plain',
}

const xhrDefaultConfig: AxiosRequestConfig = {
    headers: {
        'Content-Type': AcceptType.Json, /// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
        'Cache-Control': 'no-cache', /// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
        deviceID: `WEB-${window.navigator.userAgent}`,
        Accept: `${AcceptType.Json};charset=UTF-8`, /// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
        // Connection: 'Keep-Alive', /// HTTP1.1, https://en.wikipedia.org/wiki/HTTP_persistent_connection
        // 'Accept-Encoding': 'gzip', /// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
        // 'Accept-Charset': 'utf-8', /// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Charset
    },
    timeout: 30000,
}

interface PretreatmentResponse<T = unknown> {
    code?: number
    data?: T
    msg?: string
    message?: string
}

type StringAnyRecord = Record<string, unknown>

const isPlainRecord = (value: unknown): value is StringAnyRecord =>
    Object.prototype.toString.call(value) === '[object Object]'

const toFormData = (data: unknown): FormData => {
    const formData = new FormData()
    if (!isPlainRecord(data)) return formData

    Object.entries(data).forEach(([key, value]) => {
        if (value === null || typeof value === 'undefined') return
        if (value instanceof Blob) {
            formData.append(key, value)
            return
        }
        formData.append(key, String(value))
    })

    return formData
}

let isRedirectingToLogin = false

const redirectToLogin = async (): Promise<void> => {
    clearManageToken()

    if (isRedirectingToLogin || router.currentRoute.value.path === '/login') return

    isRedirectingToLogin = true
    const redirect = router.currentRoute.value.fullPath || '/'
    await router.replace(`/login?redirect=${encodeURIComponent(redirect)}`).finally(() => {
        isRedirectingToLogin = false
    })
}

function httpInit(instance: AxiosInstance): AxiosInstance {
    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
            // const cryptoKey =  await generateKey(String(config.url));
            // const cryptoIv =  await generateIv(await generateKey(String(config.url), false));
            // const currData = config.method === 'post' && config.headers?.isDecrypt ? await encrypt(cryptoKey, cryptoIv, config.data) : JSON.stringify(config.data);

            const now = Date.now()
            const traceId = createTraceId()
            const language = getI18nLanguage()
            const requestHeaders = {
                pretreatment: true, // 是否进行数据预处理，不进行预处理将返回原始的数据结构到集成层（适用于获取完整的数据结构，而非仅获取需要的数据）
                Token: getManageToken(),
                'X-B3-Traceid': traceId, // Traceid
                'X-B3-Spanid': traceId.slice(0, 16), // Spanid
                'Accept-Language': language, // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
                language,
                // 每次请求都生成新的时间戳，避免长期复用启动时的旧值。
                DateTime: timeStampToDate(now),
                ...config.headers,
            }

            config.headers = {
                ...(config.headers ?? {}),
                ...requestHeaders,
            } as unknown as InternalAxiosRequestConfig['headers']
            config.transformRequest = [
                (data: unknown, headers?: StringAnyRecord) => {
                    // if (headers?.['Content-Type']=== AcceptType.Json) return currData;
                    // if (headers?.['Content-Type'] === AcceptType.Plain) return currData;
                    if (headers?.['Content-Type'] === AcceptType.Multipart) return toFormData(data)
                    if (headers?.['Content-Type'] === AcceptType.stream) return toFormData(data)
                    return JSON.stringify(data ?? config.data)
                },
            ]

            return config
        },
        (error: Error) => Promise.reject(error) /* toast(error.message) */,
    )

    instance.interceptors.response.use(
        async (response: AxiosResponse): Promise<any> => {
            const {
                data,
                config: { headers },
            } = response
            // const cryptoKey =  await generateKey(String(url));
            // const cryptoIv =  await generateIv(await generateKey(String(url), false));

            if (Object.prototype.toLocaleString.call(data) === '[object Blob]') return data // 二进制下载文件
            if (!headers?.pretreatment) return data
            if (!isPlainRecord(data)) return data

            const responseData = data as PretreatmentResponse

            if ([-1, 10005, 10021].includes(Number(responseData.code))) {
                // 去登录，错误提示、异常抛出由后续流程继续处理
                await redirectToLogin()
            }

            if (Number(responseData.code) === 200) {
                // 正常
                return responseData.data
            }

            const errorMessage = String(responseData.msg ?? responseData.message ?? '')
            if (errorMessage) Message.error(errorMessage)
            return Promise.reject(errorMessage || responseData)
        },
        (error) => {
            if (error?.code === 'ERR_CANCELED') {
                return Promise.reject(error)
            }

            const { response } = error
            const rawMessage = response?.data?.msg ?? response?.data?.message ?? error?.message
            const errorMessage = rawMessage ? String(rawMessage) : ''

            if ([401, 403].includes(Number(response?.status))) {
                void redirectToLogin()
            }

            if (errorMessage) {
                Message.error(errorMessage)
                return Promise.reject(errorMessage)
            }

            return Promise.reject(error)
        },
    )

    return instance
}

/**
 * 根据配置创建一个Axios实例，该实例支持取消
 *
 * @param uri String Axios中的baseURL参数
 * @return [AxiosInstance, Canceler] 返回一个元组；该元组头部为初始化好的Axios实例，尾部为取消当前实例请求的方法
 */
export function useHttp(uri: string): [AxiosInstance, Canceler] {
    const { CancelToken } = http
    const { baseURL = uri, timeout, headers } = xhrDefaultConfig
    const source: CancelTokenSource = CancelToken.source()

    return [
        httpInit(
            http.create({
                baseURL,
                timeout,
                headers,
                cancelToken: source.token,
            }),
        ),
        source.cancel,
    ]
}

export default typeof Proxy === 'undefined'
    ? {
          instance: (uri: string): AxiosInstance => {
              const { baseURL = uri, timeout, headers } = xhrDefaultConfig
              return httpInit(
                  http.create({
                      baseURL,
                      timeout,
                      headers,
                  }),
              )
          },
      }
    : new Proxy(Object.create(null), {
          get(_target, key: string): AxiosInstance | null {
              if (key === 'instance') {
                  throw new Error('当前运行环境支持Proxy，已阻断调用instance方法获取HTTP实例')
              }
              const { baseURL = key, timeout, headers } = xhrDefaultConfig
              return httpInit(
                  http.create({
                      baseURL,
                      timeout,
                      headers,
                  }),
              )
          },
      })
