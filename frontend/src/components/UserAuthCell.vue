<script setup lang="ts">
import StatusText from '@/components/TableSearchWrap/components/StatusText.vue'

interface Props {
    status: string | number
}

defineProps<Props>()
</script>

<template>
    <!-- 认证状态统一复用 StatusText 的 authState preset，避免页面内重复维护状态映射与颜色规则。 -->
    <StatusText :value="status" preset="authState" :show-raw-when-unknown="true" />
</template>
