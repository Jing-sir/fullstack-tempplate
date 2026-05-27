<script setup lang="ts">
/**
 * CellEllipsis — 表格单元格"省略 + hover 弹出全文 + 复制"组件。
 *
 * 核心思路：
 *   用 DOM overflow 检测（spanEl.scrollWidth > spanEl.offsetWidth）替代
 *   基于字符数的启发式估算。只有文本真正被 CSS truncate 截断时，才激活
 *   主色高亮 + cursor-pointer + popover 交互，避免对短文本产生视觉噪音。
 *
 * Props：
 *   text      - 单元格展示文本（已格式化，空值为 "--"）
 *   showCopy  - 是否在弹层底部显示"复制"按钮（时间列传 false）
 *   copyable  - 外部判断文本是否允许被复制（-- 不可复制）
 *
 * Emits：
 *   copy(text) - 点击"复制"按钮后通知父层执行复制逻辑
 */

const props = defineProps<{
    text: string
    showCopy: boolean
    copyable: boolean
}>()

const emit = defineEmits<{
    (e: 'copy', text: string): void
}>()

// ─── DOM 引用与状态 ────────────────────────────────────────────────────────────

const spanEl = ref<HTMLElement | null>(null)

/** 文本是否真正被截断（首次 mouseenter 检测，之后保持） */
const isTruncated = ref(false)

/** 当前是否处于 hover 状态（控制主色高亮，离开时还原） */
const isHovered = ref(false)

const checkOverflow = (): void => {
    if (!spanEl.value) return
    isTruncated.value = spanEl.value.scrollWidth > spanEl.value.offsetWidth
}

const handleMouseEnter = (): void => {
    checkOverflow()
    isHovered.value = true
}

const handleMouseLeave = (): void => {
    isHovered.value = false
}

// 文本内容变化时重置截断状态，待下次 mouseenter 重新检测
watch(
    () => props.text,
    () => {
        isTruncated.value = false
    },
)
</script>

<template>
    <!--
        检测到真正溢出时才渲染 a-popover（触发器 + 弹层），
        否则只渲染普通 span，彻底避免 Arco popover 的隐藏/显示副作用。
    -->
    <a-popover
        v-if="isTruncated"
        trigger="hover"
        position="tl"
    >
        <!-- 溢出态：hover 时主色高亮，离开时还原 -->
        <span
            ref="spanEl"
            class="block max-w-full cursor-pointer truncate transition-colors"
            :style="{
                color: isHovered
                    ? 'color-mix(in srgb, var(--color-primary-6) 72%, white 28%)'
                    : 'var(--app-text)',
            }"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
        >
            {{ text }}
        </span>

        <!-- 弹出层：完整文本 + 左对齐复制按钮 -->
        <template #content>
            <div class="space-y-1">
                <div class="whitespace-nowrap text-[var(--app-text)]">{{ text }}</div>
                <a-button
                    v-if="showCopy && copyable"
                    type="text"
                    size="mini"
                    class="!px-0"
                    @click.stop="emit('copy', text)"
                >
                    {{ $t('复制') }}
                </a-button>
            </div>
        </template>
    </a-popover>

    <!--
        未溢出态（包括初始态）：普通 span，mouseenter 时检测是否溢出。
        如果检测到溢出，isTruncated 变为 true，下一帧切换到 a-popover 分支。
    -->
    <span
        v-else
        ref="spanEl"
        class="block max-w-full truncate"
        :style="{
            color: text === '--' ? 'var(--app-text-muted)' : 'var(--app-text)',
        }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        {{ text }}
    </span>
</template>
