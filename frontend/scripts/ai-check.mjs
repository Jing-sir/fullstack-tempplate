import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const srcRoot = join(root, 'src')
const apiRoot = join(srcRoot, 'api')
const backendHandlerFile = join(root, '..', 'backend', 'internal', 'handler', 'handler.go')

const allowedAxiosFiles = new Set([
    'src/api/api.ts',
    'src/api/file.ts',
    'src/plugins/http.ts',
    'src/setup/i18n-setup.ts',
])

const allowedConfirmFiles = new Set([
    'src/use/useConfirmAction.ts',
    'src/components/TableSearchWrap/hooks/useTableCellPreset.ts',
])

const allowedManualDownloadFiles = new Set([
    'src/components/TableSearchWrap/components/ExportButton.vue',
    'src/views/User/LabelList/modal/ImportTagsModal.vue',
    'src/views/User/LabelList/drawer/ImportTagsDrawer.vue',
])

const legacyBackendContractAllowlist = new Set([
    'GET /enterprise-transfer/config',
    'GET /trade/options',
    'GET /trade/external-options',
])

const errors = []
const warnings = []

const toProjectPath = (filePath) => relative(root, filePath).replaceAll('\\', '/')

const isSourceFile = (filePath) => /\.(vue|ts|tsx|js|jsx)$/.test(filePath)

const walk = (dir) => {
    const result = []

    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === 'dist') continue

        const filePath = join(dir, entry)
        const stat = statSync(filePath)

        if (stat.isDirectory()) {
            result.push(...walk(filePath))
        } else if (isSourceFile(filePath)) {
            result.push(filePath)
        }
    }

    return result
}

const addError = (file, message) => {
    errors.push(`${file}: ${message}`)
}

const addWarning = (file, message) => {
    warnings.push(`${file}: ${message}`)
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizePath = (path) => {
    const cleanPath = path.split('?')[0].replace(/\/+$/, '')
    return cleanPath || '/'
}

const frontendTemplatePathToRoute = (path) => normalizePath(path.replace(/\$\{[^}]+\}/g, ':param'))

const routePathToRegex = (path) => {
    const normalized = normalizePath(path)
    const pattern = normalized
        .split('/')
        .map((part) => (part.startsWith(':') ? '[^/]+' : escapeRegex(part)))
        .join('/')
    return new RegExp(`^${pattern}$`)
}

const collectBackendRoutes = () => {
    if (!existsSync(backendHandlerFile)) return []

    const content = readFileSync(backendHandlerFile, 'utf8')
    const routes = []
    const routeRegex = /\b(?:api|auth)\.(GET|POST|PUT|DELETE)\("([^"]+)"/g
    for (const match of content.matchAll(routeRegex)) {
        routes.push({
            method: match[1],
            path: normalizePath(match[2]),
            pattern: routePathToRegex(match[2]),
        })
    }
    return routes
}

const collectFrontendApiCalls = () => {
    if (!existsSync(apiRoot)) return []

    const calls = []
    const apiCallRegex =
        /\bthis\.api\.(get|post|put|delete)\s*(?:<[\s\S]*?>)?\s*\(\s*(['"`])([^'"`]+)\2/g

    for (const filePath of walk(apiRoot)) {
        const file = toProjectPath(filePath)
        const content = readFileSync(filePath, 'utf8')
        for (const match of content.matchAll(apiCallRegex)) {
            const path = frontendTemplatePathToRoute(match[3])
            if (!path.startsWith('/')) continue
            calls.push({
                file,
                method: match[1].toUpperCase(),
                path,
            })
        }
    }
    return calls
}

const checkApiContracts = () => {
    const backendRoutes = collectBackendRoutes()
    if (!backendRoutes.length) return

    for (const call of collectFrontendApiCalls()) {
        const key = `${call.method} ${call.path}`
        const matched = backendRoutes.some(
            (route) => route.method === call.method && route.pattern.test(call.path),
        )
        if (matched) continue

        if (legacyBackendContractAllowlist.has(key)) {
            addWarning(call.file, `历史接口 ${key} 当前后端未注册，请确认对应模块是否仍需保留。`)
            continue
        }

        addError(call.file, `前端 API ${key} 未匹配到后端 Gin 路由。`)
    }
}

for (const filePath of walk(srcRoot)) {
    const file = toProjectPath(filePath)
    const content = readFileSync(filePath, 'utf8')

    if (/api\/fetchTest|@\/api\/fetchTest/.test(content)) {
        addError(file, '禁止新增或继续引用 api/fetchTest。')
    }

    if (file !== 'src/routes/layout.ts' && /@\/Main\.vue/.test(content)) {
        addError(
            file,
            '顶级布局请复用 src/routes/layout.ts 的 MainLayout，不要重复动态导入 @/Main.vue。',
        )
    }

    if (/virtual:pwa|registerSW|workbox-window|workbox-routing|workbox-strategies/.test(content)) {
        addError(file, '当前项目已禁用 PWA，请不要重新引入 PWA / Workbox 运行代码。')
    }

    if (
        /@\/api\/example|exampleApi|ExampleItem|ExampleListParams|SaveExampleParams|exampleState|示例列表|示例名称/.test(
            content,
        )
    ) {
        addError(file, '发现 AI 模板占位符，复制 ai-templates 后必须替换为真实业务命名。')
    }

    if (
        /from ['"]axios['"]|import\s+axios\b|axios\./.test(content) &&
        !allowedAxiosFiles.has(file)
    ) {
        addError(file, '业务代码禁止直接使用 axios，请放到 src/api 并复用 Api 基类。')
    }

    if (/Modal\.confirm\s*\(/.test(content) && !allowedConfirmFiles.has(file)) {
        addError(file, '确认操作请复用 useConfirmAction 或 TableSearchWrap 内置确认配置。')
    }

    if (
        /document\.createElement\(['"]a['"]\)/.test(content) &&
        !allowedManualDownloadFiles.has(file)
    ) {
        addError(file, '导出/下载请优先使用 exportConfig 或公共导出组件。')
    }

    if (/src\/views\/.+\/Index\.vue$/.test(file) && /<a-table\b/.test(content)) {
        addError(file, '列表页禁止手写 a-table，请使用 TableSearchWrap。')
    }

    if (/src\/views\/.+\/Index\.vue$/.test(file) && /<a-pagination\b/.test(content)) {
        addError(file, '列表页禁止手写分页，请使用 TableSearchWrap。')
    }

    if (/t\(['"][a-zA-Z][a-zA-Z0-9_-]*\.[a-zA-Z0-9_.-]+['"]\)/.test(content)) {
        addWarning(file, '疑似英文语义 i18n key，请确认本项目是否应使用中文原文 key。')
    }
}

checkApiContracts()

if (warnings.length > 0) {
    console.log('AI 架构检查警告：')
    for (const warning of warnings) {
        console.log(`- ${warning}`)
    }
    console.log('')
}

if (errors.length > 0) {
    console.error('AI 架构检查未通过：')
    for (const error of errors) {
        console.error(`- ${error}`)
    }
    process.exit(1)
}

console.log('AI 架构检查通过。')
