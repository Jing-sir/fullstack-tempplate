<script setup lang="ts">
import {
    STATUS_PRESET_MAP,
    STATUS_TONE_COLOR_MAP,
    normalizeStatusValue,
} from '@/enums/statusText'
import type { StatusMeta, StatusPreset, StatusValue } from '@/enums/statusText'

interface StatusTextProps {
    value: StatusValue
    preset: StatusPreset
    fallback?: string
    showRawWhenUnknown?: boolean
}

const props = withDefaults(defineProps<StatusTextProps>(), {
    fallback: '--',
    showRawWhenUnknown: false,
})

const { t } = useI18n()

const statusMap = computed<Record<string, StatusMeta>>(() => STATUS_PRESET_MAP[props.preset] ?? {})

const normalizedValue = computed(() => {
    return normalizeStatusValue(props.value)
})

/**
 * 最终状态展示信息。
 * 如果映射不到，就显示 fallback，避免页面侧再写一层兜底逻辑。
 */
const statusMeta = computed<StatusMeta | null>(() => {
    const key = normalizedValue.value
    if (!key) return null
    return statusMap.value[key] ?? null
})

/**
 * 未匹配到 preset 映射时，可选展示原始值用于问题排查。
 * 默认仍保持原行为：输出 fallback。
 */
const displayText = computed(() => {
    if (statusMeta.value) {
        return t(statusMeta.value.label)
    }

    if (props.showRawWhenUnknown && normalizedValue.value) {
        return normalizedValue.value
    }

    return props.fallback
})

/**
 * 状态颜色统一走语义色映射，避免在业务组件硬编码具体颜色值。
 */
const textColor = computed(() => {
    if (!statusMeta.value) return STATUS_TONE_COLOR_MAP.muted
    return STATUS_TONE_COLOR_MAP[statusMeta.value.tone]
})
</script>

<template>
    <!-- 状态文本：按 preset + value 输出文案，并由语义色统一管理视觉样式 -->
    <span :style="{ color: textColor }">
        {{ displayText }}
    </span>
</template>
