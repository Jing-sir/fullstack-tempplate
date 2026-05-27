import { Modal } from '@arco-design/web-vue'
import { get } from 'lodash-es'
import type {
    ColumnType,
    TableActionButtonConfig,
    TableButtonStatus,
    TableCellPresetActionButtonsConfig,
    TableCellPresetConfig,
    TableCellPresetCopyableTextConfig,
    TableCellPresetLabelTagsConfig,
    TableCellPresetPercentTextConfig,
    TableCellPresetStatusTextConfig,
} from '@/interface/TableType'

type Translate = (message: string) => string

type PresetStatusValue = string | number | boolean | null | undefined

type PresetLabelTagItem = {
    id?: string | number
    name?: string
    color?: string
}

interface UseTableCellPresetOptions {
    t: Translate
}

export default function useTableCellPreset({ t }: UseTableCellPresetOptions) {
    /**
     * 运行时按 preset.type 精确收窄类型，
     * 这样模板里访问 preset 专属字段时可以保持类型安全。
     */
    const isLabelTagsCellPreset = (
        preset: TableCellPresetConfig | undefined,
    ): preset is TableCellPresetLabelTagsConfig => Boolean(preset && preset.type === 'labelTags')

    const isStatusTextCellPreset = (
        preset: TableCellPresetConfig | undefined,
    ): preset is TableCellPresetStatusTextConfig => Boolean(preset && preset.type === 'statusText')

    const isPercentTextCellPreset = (
        preset: TableCellPresetConfig | undefined,
    ): preset is TableCellPresetPercentTextConfig => Boolean(preset && preset.type === 'percentText')

    const isActionButtonsCellPreset = (
        preset: TableCellPresetConfig | undefined,
    ): preset is TableCellPresetActionButtonsConfig =>
        Boolean(preset && preset.type === 'actionButtons')

    const isCopyableTextCellPreset = (
        preset: TableCellPresetConfig | undefined,
    ): preset is TableCellPresetCopyableTextConfig =>
        Boolean(preset && preset.type === 'copyableText')

    /**
     * 状态值读取策略：
     * 1. 先取 valueFields（多候选字段）
     * 2. 再退回 valueField
     * 3. 最后退回当前列 dataIndex
     *
     * 这样后端字段不稳定时，页面仍可通过配置保持兼容。
     */
    const pickPresetStatusValue = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetStatusTextConfig,
    ): PresetStatusValue => {
        const fieldList = preset.valueFields?.length
            ? preset.valueFields
            : [preset.valueField || String(column.dataIndex || '')]

        for (const field of fieldList) {
            if (!field) continue
            const fieldValue = get(record, field)
            if (fieldValue !== null && typeof fieldValue !== 'undefined' && fieldValue !== '') {
                if (typeof fieldValue === 'object') {
                    return String(fieldValue)
                }
                return fieldValue as PresetStatusValue
            }
        }

        return ''
    }

    /**
     * 标签列表优先走结构化字段（数组），
     * 保证 LabelTagList 能拿到完整的颜色/名称等信息。
     */
    const pickPresetLabelList = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetLabelTagsConfig,
    ): PresetLabelTagItem[] | undefined => {
        const labelListField = preset.labelListField || String(column.dataIndex || '')
        if (!labelListField) return undefined
        const labelList = get(record, labelListField)
        return Array.isArray(labelList) ? (labelList as PresetLabelTagItem[]) : undefined
    }

    /**
     * 如果业务只返回“逗号拼接的标签字符串”，
     * 这里统一转成 string 交给 LabelTagList 兜底展示。
     */
    const pickPresetLabelNames = (
        record: Record<string, unknown>,
        preset: TableCellPresetLabelTagsConfig,
    ): string | undefined => {
        if (!preset.labelNamesField) return undefined
        const labelNames = get(record, preset.labelNamesField)
        if (labelNames === null || typeof labelNames === 'undefined') return undefined
        return String(labelNames)
    }

    /**
     * labelTags 条件渲染：
     * - 未配置 renderWhen 时默认按标签模式渲染
     * - 配置后仅在命中指定字段值时渲染标签，否则回退普通文本
     */
    const shouldRenderPresetLabelTags = (
        record: Record<string, unknown>,
        preset: TableCellPresetLabelTagsConfig,
    ): boolean => {
        if (!preset.renderWhen) return true

        const sourceValue = get(record, preset.renderWhen.field)
        if (sourceValue === null || typeof sourceValue === 'undefined') return false

        const normalizedSourceValue = String(sourceValue)
        return preset.renderWhen.values.some(
            (value) => String(value) === normalizedSourceValue,
        )
    }

    const pickPresetLabelFallbackText = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetLabelTagsConfig,
    ): string => {
        const targetField =
            preset.fallbackTextField ||
            preset.labelNamesField ||
            String(column.dataIndex || '')

        if (!targetField) return ''
        const text = get(record, targetField)
        if (text === null || typeof text === 'undefined' || text === '') return ''
        return String(text)
    }

    const pickPresetLabelFallbackTooltip = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetLabelTagsConfig,
    ): string => {
        const targetField =
            preset.fallbackTooltipField ||
            preset.fallbackTextField ||
            preset.labelNamesField ||
            String(column.dataIndex || '')

        if (!targetField) return ''
        const text = get(record, targetField)
        if (text === null || typeof text === 'undefined' || text === '') return ''
        return String(text)
    }

    /**
     * 百分比文本渲染：
     * - 默认从当前列 dataIndex 读取值
     * - 空值显示 fallback（默认 --）
     * - 非空值拼接后缀（默认 %）
     */
    const pickPresetPercentText = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetPercentTextConfig,
    ): string => {
        const targetField = preset.valueField || String(column.dataIndex || '')
        if (!targetField) return preset.fallback || '--'

        const rawValue = get(record, targetField)
        if (rawValue === null || typeof rawValue === 'undefined' || rawValue === '') {
            return preset.fallback || '--'
        }

        const suffix = preset.suffix || '%'
        const normalizedText = String(rawValue)
        if (!suffix) return normalizedText
        if (normalizedText.trim().endsWith(suffix)) return normalizedText
        return `${normalizedText}${suffix}`
    }

    const pickPresetCopyableText = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetCopyableTextConfig,
    ): string => {
        const targetField = preset.valueField || String(column.dataIndex || '')
        if (!targetField) return preset.fallback || '--'

        const rawValue = get(record, targetField)
        if (rawValue === null || typeof rawValue === 'undefined' || rawValue === '') {
            return preset.fallback || '--'
        }

        return String(rawValue)
    }

    const pickPresetCopyText = (
        record: Record<string, unknown>,
        column: ColumnType,
        preset: TableCellPresetCopyableTextConfig,
    ): string => {
        const targetField = preset.copyField || preset.valueField || String(column.dataIndex || '')
        if (!targetField) return ''

        const rawValue = get(record, targetField)
        if (rawValue === null || typeof rawValue === 'undefined' || rawValue === '') {
            return ''
        }

        return String(rawValue)
    }

    /**
     * 行级按钮显隐统一在这里处理，
     * 支持布尔值和“按行数据动态判断”两种写法。
     */
    const isActionButtonVisible = (
        button: TableActionButtonConfig,
        record: Record<string, unknown>,
    ): boolean => {
        if (typeof button.show === 'function') {
            return button.show(record)
        }

        if (typeof button.show === 'boolean') {
            return button.show
        }

        return true
    }

    const isActionButtonDisabled = (
        button: TableActionButtonConfig,
        record: Record<string, unknown>,
    ): boolean => {
        if (typeof button.disabled === 'function') {
            return button.disabled(record)
        }

        return Boolean(button.disabled)
    }

    const getActionButtonLoading = (
        button: TableActionButtonConfig,
        record: Record<string, unknown>,
    ): boolean => {
        if (!button.loadingField) return false
        return Boolean(get(record, button.loadingField))
    }

    const getActionButtonStatus = (
        button: TableActionButtonConfig,
        record: Record<string, unknown>,
    ): TableButtonStatus | undefined => {
        if (typeof button.status === 'function') {
            return button.status(record)
        }
        return button.status
    }

    const getActionButtonText = (
        button: TableActionButtonConfig,
        record: Record<string, unknown>,
    ): string => {
        const text = typeof button.text === 'function' ? button.text(record) : button.text
        return t(text)
    }

    /**
     * 按钮点击默认支持“二次确认”。
     * 未配置 confirm 时直接执行，配置 confirm 时统一走 Modal.confirm，确保交互一致。
     */
    const handleActionButtonClick = (
        button: TableActionButtonConfig,
        record: Record<string, unknown>,
    ): void => {
        const runAction = async (): Promise<void> => {
            await button.onClick(record)
        }

        if (!button.confirm) {
            void runAction()
            return
        }

        const content =
            typeof button.confirm.content === 'function'
                ? button.confirm.content(record)
                : button.confirm.content

        Modal.confirm({
            title: t(button.confirm.title || '确认'),
            content: t(content),
            okText: t(button.confirm.okText || '确认'),
            cancelText: t(button.confirm.cancelText || '取消'),
            hideCancel: false,
            draggable: false,
            simple: false,
            onOk: runAction,
        })
    }

    return {
        getActionButtonText,
        pickPresetLabelList,
        pickPresetLabelNames,
        pickPresetPercentText,
        getActionButtonStatus,
        pickPresetCopyText,
        pickPresetStatusValue,
        pickPresetCopyableText,
        isActionButtonVisible,
        isLabelTagsCellPreset,
        isPercentTextCellPreset,
        isStatusTextCellPreset,
        isCopyableTextCellPreset,
        isActionButtonDisabled,
        getActionButtonLoading,
        handleActionButtonClick,
        isActionButtonsCellPreset,
        shouldRenderPresetLabelTags,
        pickPresetLabelFallbackText,
        pickPresetLabelFallbackTooltip,
    }
}
