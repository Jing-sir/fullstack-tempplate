import { expect, type Page } from '@playwright/test'

type RuntimeIssue = {
    source: 'pageerror' | 'requestfailed'
    message: string
}

const IGNORE_REQUEST_FAILURE_PATTERNS = [
    // 浏览器扩展、icon 或 analytics 等非业务资源失败不拦截主流程
    /chrome-extension:\/\//i,
    /favicon\.ico$/i,
]

export function attachRuntimeGuard(page: Page) {
    const issues: RuntimeIssue[] = []

    page.on('pageerror', (error) => {
        issues.push({
            source: 'pageerror',
            message: error.message,
        })
    })

    page.on('requestfailed', (request) => {
        const url = request.url()
        if (IGNORE_REQUEST_FAILURE_PATTERNS.some((pattern) => pattern.test(url))) {
            return
        }

        const failure = request.failure()
        issues.push({
            source: 'requestfailed',
            message: `${url} -> ${failure?.errorText || 'unknown failure'}`,
        })
    })

    return {
        assertNoRuntimeIssue: () => {
            const messages = issues.map((issue) => `[${issue.source}] ${issue.message}`)
            expect(messages, '页面运行时出现异常，请查看失败详情').toEqual([])
        },
    }
}
