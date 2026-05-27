<script setup lang="ts">
interface LabelTagItem {
    id?: string | number
    name?: string
    color?: string
}

interface LabelTagListProps {
    labelList?: LabelTagItem[] | null
    labelNames?: string | null
    maxVisible?: number
    emptyText?: string
}

const props = withDefaults(defineProps<LabelTagListProps>(), {
    labelList: () => [],
    labelNames: '',
    maxVisible: 3,
    emptyText: '--',
})

// 统一兜底标签数组，避免后端返回 null/undefined 时模板分支散落在调用页面。
const safeLabelList = computed<LabelTagItem[]>(() =>
    Array.isArray(props.labelList) ? props.labelList : [],
)

// 兼容仅返回字符串标签名的接口结构（如 "A,B,C" / "A，B，C" / "A、B、C"）。
const safeLabelNameList = computed<string[]>(() => {
    const text = String(props.labelNames || '').trim()
    if (!text) return []

    return text
        .split(/[,\uFF0C\u3001]/)
        .map((item) => item.trim())
        .filter(Boolean)
})

// tooltip 文案优先复用后端透出的完整字符串；缺失时用标签名拼接，保持交互一致。
const tooltipContent = computed<string>(() => {
    const normalizedLabelNames = String(props.labelNames || '').trim()
    if (normalizedLabelNames) return normalizedLabelNames

    const labelNameList = safeLabelList.value
        .map((item) => String(item.name || '').trim())
        .filter(Boolean)

    return labelNameList.length ? labelNameList.join('、') : props.emptyText
})

// 列表单元格默认最多展示前 N 个标签，其余通过省略号提示存在更多内容。
const visibleLabelList = computed<LabelTagItem[]>(() =>
    safeLabelList.value.length
        ? safeLabelList.value.slice(0, Math.max(0, props.maxVisible))
        : safeLabelNameList.value.slice(0, Math.max(0, props.maxVisible)).map((name) => ({
              name,
          })),
)

const hasOverflow = computed<boolean>(() =>
    safeLabelList.value.length
        ? safeLabelList.value.length > props.maxVisible
        : safeLabelNameList.value.length > props.maxVisible,
)
</script>

<template>
    <a-tooltip :content="tooltipContent">
        <div class="flex flex-wrap gap-1">
            <a-tag
                v-for="(item, index) in visibleLabelList"
                :key="item.id ?? `${item.name || 'label'}-${index}`"
                :color="item.color"
                size="small"
            >
                {{ item.name || props.emptyText }}
            </a-tag>
            <span v-if="hasOverflow">...</span>
            <span v-if="!visibleLabelList.length">{{ props.emptyText }}</span>
        </div>
    </a-tooltip>
</template>
