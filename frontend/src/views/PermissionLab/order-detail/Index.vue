<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.id ?? ''))
</script>

<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <h2 class="text-base font-semibold text-[var(--app-text)]">
                    {{ t('订单详情') }}
                </h2>
                <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ orderId }}</p>
            </div>
            <a-button @click="router.back()">{{ t('返回') }}</a-button>
        </div>

        <a-descriptions :column="2" bordered>
            <a-descriptions-item :label="t('订单号')">{{ orderId }}</a-descriptions-item>
            <a-descriptions-item :label="t('客户名称')">Alpha Trading</a-descriptions-item>
            <a-descriptions-item :label="t('订单金额')">12,800.00 USDT</a-descriptions-item>
            <a-descriptions-item :label="t('订单状态')">{{ t('待审核') }}</a-descriptions-item>
        </a-descriptions>
    </div>
</template>
