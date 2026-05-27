<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { IconCopy } from '@arco-design/web-vue/es/icon'
import copyToClipboard from '@/utils/copyToClipboard'

const props = withDefaults(
    defineProps<{
        text: string
        copyText?: string
    }>(),
    {
        copyText: '',
    },
)

const { t } = useI18n()
const displayText = computed(() => props.text || '--')
const copyValue = computed(() => props.copyText || props.text)
const canCopy = computed(() => Boolean(copyValue.value && copyValue.value !== '--'))

const handleCopy = (): void => {
    if (!canCopy.value) return

    try {
        copyToClipboard(copyValue.value)
        Message.success(t('复制成功'))
    } catch {
        Message.error(t('复制失败'))
    }
}
</script>

<template>
    <span
        class="group inline-flex max-w-full items-center gap-1 align-middle"
        :class="{ 'text-[var(--app-text-muted)]': displayText === '--' }"
    >
        <span class="min-w-0 break-words">
            {{ displayText }}
        </span>
        <!-- hover 时才显示复制按钮，减少视觉噪音 -->
        <a-tooltip v-if="canCopy" :content="$t('复制')">
            <a-button
                type="text"
                size="mini"
                class="!h-5 !px-0 text-[var(--app-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-primary-6)]"
                :aria-label="$t('复制')"
                @click.stop="handleCopy"
            >
                <template #icon>
                    <IconCopy />
                </template>
            </a-button>
        </a-tooltip>
    </span>
</template>
