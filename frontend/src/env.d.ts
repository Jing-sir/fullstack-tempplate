declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
    export default component
}

declare module 'nprogress' // 进度条

declare module 'virtual:message' {
    export const message: unknown
}

interface ImportMetaEnv {
    readonly DEV: boolean
    readonly VITE_APP_BASE_URL: string
    readonly VITE_PUBLIC_PATH: string
    readonly VITE_DEV_PROXY_TARGET?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
