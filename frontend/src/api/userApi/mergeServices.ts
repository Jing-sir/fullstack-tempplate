export type ApiMethodMap = Record<string, (...args: any[]) => any>

/**
 * 将多个按前缀拆分的 service 实例合并成一个对象，作为历史入口文件的兼容出口。
 * 这样可以完成目录重构，同时尽量减少调用方改造成本。
 */
export function mergeApiServices(...services: object[]): ApiMethodMap {
    return services.reduce<ApiMethodMap>((acc, service) => {
        const prototype = Object.getPrototypeOf(service) as Record<string, unknown>
        const methodNames = Object.getOwnPropertyNames(prototype).filter((methodName) => {
            if (methodName === 'constructor') return false
            return typeof (service as Record<string, unknown>)[methodName] === 'function'
        })

        methodNames.forEach((methodName) => {
            const method = (service as Record<string, (...args: any[]) => any>)[methodName]
            if (import.meta.env.DEV && acc[methodName]) {
                console.warn(`Duplicate API service method "${methodName}" was overwritten.`)
            }
            acc[methodName] = method.bind(service)
        })

        return acc
    }, {})
}
