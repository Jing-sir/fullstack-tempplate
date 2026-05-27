<script setup lang="ts">
interface Props {
    title: string;
    description: string;
}

defineProps<Props>();
</script>

<template>
    <section class="rounded-[var(--app-pane-radius)] border border-[var(--app-divider)] bg-[var(--app-surface)] p-4">
        <!-- 图表卡片头部：统一展示标题与说明，降低各图表组件重复结构。 -->
        <header class="mb-3">
            <h3 class="text-base font-semibold text-[var(--app-text)]">
                {{ title }}
            </h3>
            <p class="mt-1 text-xs text-[var(--app-text-muted)]">
                {{ description }}
            </p>
        </header>
        <slot />
    </section>
</template>
