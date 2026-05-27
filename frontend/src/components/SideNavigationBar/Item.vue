<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import type { SidebarMenuNode } from '@/interface/SideNavigationType'
defineOptions({
    name: 'SideNavigationBarItem',
})

const props = defineProps<{
    item: SidebarMenuNode
}>()

const hasChildren = computed(() => Boolean(props.item.children?.length))
const menuChildren = computed(() => props.item.children ?? [])
</script>

<template>
    <a-sub-menu v-if="hasChildren" :key="props.item.key" :title="props.item.title">
        <template v-if="props.item.icon" #icon>
            <Icon :icon-type="props.item.icon" />
        </template>
        <Item v-for="child in menuChildren" :key="child.key" :item="child" />
    </a-sub-menu>
    <a-menu-item v-else :key="props.item.key">
        <template v-if="props.item.icon" #icon>
            <Icon :icon-type="props.item.icon" />
        </template>
        {{ props.item.title }}
    </a-menu-item>
</template>
