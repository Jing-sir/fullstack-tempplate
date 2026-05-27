import type { StatusMeta } from '@/enums/statusText'

// 这个 import 只用于模板文件自身的类型提示。
// 复制到 src/enums/statusText.ts 时不要复制 import，并且必须同时做三处修改：
// 1. 在 StatusPreset 联合类型里新增：| 'exampleState'
// 2. 新增下面这个映射常量
// 3. 在 STATUS_PRESET_MAP 里新增：exampleState: EXAMPLE_STATE_MAP

const EXAMPLE_STATE_MAP: Record<string, StatusMeta> = {
    '1': { label: '启用', tone: 'success' },
    '2': { label: '禁用', tone: 'danger' },
    启用: { label: '启用', tone: 'success' },
    禁用: { label: '禁用', tone: 'danger' },
}
