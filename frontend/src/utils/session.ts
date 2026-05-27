const MANAGE_TOKEN_COOKIE_NAME = 'manageToken'
const COOKIE_PATH = '/'
const AUTH_COOKIE_SAME_SITE = 'Strict'

const getCookieSecureFlag = (): string => {
    if (typeof window === 'undefined') return ''
    return window.location.protocol === 'https:' ? ';Secure' : ''
}

const writeCookie = (name: string, value: string, maxAge?: number): void => {
    const encodedName = encodeURIComponent(name)
    const encodedValue = encodeURIComponent(value)
    const maxAgeText = typeof maxAge === 'number' ? `;Max-Age=${maxAge}` : ''

    document.cookie = `${encodedName}=${encodedValue};path=${COOKIE_PATH};SameSite=${AUTH_COOKIE_SAME_SITE}${getCookieSecureFlag()}${maxAgeText}`
}

const readCookie = (name: string): string => {
    const encodedName = `${encodeURIComponent(name)}=`
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(encodedName))

    if (!cookie) return ''
    return decodeURIComponent(cookie.slice(encodedName.length))
}

export const getManageToken = (): string => readCookie(MANAGE_TOKEN_COOKIE_NAME)

export const setManageToken = (token = ''): void => {
    writeCookie(MANAGE_TOKEN_COOKIE_NAME, token)
}

export const clearManageToken = (): void => {
    writeCookie(MANAGE_TOKEN_COOKIE_NAME, '', 0)
}

export const createTraceId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '')
    }

    const randomPart = Math.random().toString(16).slice(2).padEnd(16, '0')
    return `${Date.now().toString(16)}${randomPart}`.slice(0, 32)
}
