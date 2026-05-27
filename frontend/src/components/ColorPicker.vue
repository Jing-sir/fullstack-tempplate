<script setup lang="ts">
import theme from '@/store/theme';

const store = theme();

</script>

<template>
    <a-space>
        <a-color-picker v-model="store.defaultColor" size="mini" show-text disabled-alpha @change="store.upDefaultColor" />
    </a-space>
</template>
