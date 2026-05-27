<template>
    <div class="flex-direction-column flex-align-items-center router-view-wrap">
        <a-empty style="margin-top: 140px" :description="t('页面不存在或已失效')" />
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

defineOptions({
    name: 'Error',
});
</script>
