<script setup lang="ts">
import { Icon } from '@arco-design/web-vue';
import {
    IconApps,
    IconBook,
    IconDashboard,
    IconFile,
    IconGift,
    IconLocation,
    IconSettings,
    IconStorage,
    IconSwap,
    IconUserGroup,
    IconStar,
} from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';

const IconFont = Icon.addFromIconFontCn({
    src: 'https://at.alicdn.com/t/c/font_4236741_ak9xwdnyjlk.js',
});

const props = defineProps({
    iconType: {
        type: String,
        default: () => '',
    },
});

const builtInIconMap: Record<string, Component> = {
    'icon-zhuye': IconDashboard,
    Home: IconDashboard,
    home: IconDashboard,
    systemManage: IconApps,
    operationLog: IconFile,
    rolePermissions: IconSettings,
    accountManage: IconUserGroup,
    addressManage: IconLocation,
    assetManage: IconStorage,
    flashExchange: IconSwap,
    invitationRebateManage: IconGift,
    kolConfiguration: IconStar,
    error: IconBook,
};

const builtInIcon = computed<Component | null>(() => {
    const key = props.iconType?.trim();
    if (!key) return null;

    return builtInIconMap[key] ?? null;
});
</script>

<template>
    <component :is="builtInIcon" v-if="builtInIcon" />
    <IconFont v-else :type="props.iconType" />
</template>
