<script setup lang="ts">
import accountAuthApi from '@/api/userApi/account/auth'
import type { authenticationInfo } from '@/api/userApi/types.d'
import { Message } from '@arco-design/web-vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<authenticationInfo | null>(null)

/**
 * 审核状态统一映射：避免模板里散落多段 if/else。
 */
const getStatusMeta = (value: 'WAIT' | 'GREEN' | 'RED') => {
    if (value === 'GREEN') {
        return {
            type: 'success' as const,
            title: t('已通过'),
            description: t('用户认证信息已通过'),
        }
    }

    if (value === 'RED') {
        return {
            type: 'error' as const,
            title: t('未通过'),
            description: t('用户认证信息未通过'),
        }
    }

    return {
        type: 'info' as const,
        title: t('未认证'),
        description: t('用户还未认证信息'),
    }
}

const queryDetail = async (): Promise<void> => {
    const accountId = String(route.params.id || '')
    if (!accountId) {
        Message.warning(t('参数错误'))
        return
    }

    loading.value = true
    try {
        detail.value = await accountAuthApi.getUserAuthDetail({ accountId })
    } finally {
        loading.value = false
    }
}

const handleBack = (): void => {
    router.back()
}

const getMiddleName = (item: Record<string, unknown>): string =>
    String(item.middleMing ?? '--')

onMounted(() => {
    queryDetail().catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
})
</script>

<template>
    <section class="space-y-4 rounded-[10px] bg-[var(--app-surface-strong)] p-4">
        <a-skeleton v-if="loading" :loading="loading" :animation="true">
            <a-skeleton-line :rows="8" />
        </a-skeleton>

        <a-empty v-else-if="!detail" />

        <template v-else>
            <article
                v-for="(item, index) in detail.documentList"
                :key="`${item.documentTypeName}-${index}`"
                class="space-y-4 rounded-[8px] border border-[var(--app-divider)] p-4"
            >
                <header class="text-base font-semibold">
                    {{ item.documentTypeName }}{{ t('信息') }}
                </header>

                <a-descriptions :column="2" bordered>
                    <a-descriptions-item :label="t('UID')">{{ item.accountId || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('性别')">{{ item.sex || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('姓')">{{ item.xing || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('名')">{{ item.ming || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('中间名')">{{ getMiddleName(item as Record<string, unknown>) }}</a-descriptions-item>
                    <a-descriptions-item :label="t('证件类型')">{{ item.documentTypeName || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('证件号')">{{ item.documentNumber || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('证件签发国家/地区')">{{ item.countryCodeName || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('居住国家/地区')">{{ item.livingCountryName || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('国籍')">{{ item.nationalityName || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('证件签发日期')">{{ item.issuingDate || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('证件到期日期')">{{ item.expirationDate || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('用户出生日期')">{{ item.dob || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('用户登记地址')">{{ item.documentAddress || '--' }}</a-descriptions-item>
                    <a-descriptions-item :label="t('提交认证时间')">{{ item.createTime || '--' }}</a-descriptions-item>
                </a-descriptions>

                <a-alert
                    :type="getStatusMeta(item.reviewAnswer).type"
                    :title="getStatusMeta(item.reviewAnswer).title"
                >
                    <template #description>
                        <div class="space-y-2">
                            <a-tag v-if="item.clientComment" color="red">{{ item.clientComment }}</a-tag>
                            <div>{{ getStatusMeta(item.reviewAnswer).description }}</div>
                        </div>
                    </template>
                </a-alert>

                <div class="grid gap-4 md:grid-cols-2">
                    <a-card :title="t('证件正面')">
                        <a-image v-if="item.frontUri" :src="item.frontUri" width="100%" />
                        <a-empty v-else />
                    </a-card>
                    <a-card :title="t('证件背面')">
                        <a-image v-if="item.backUri" :src="item.backUri" width="100%" />
                        <a-empty v-else />
                    </a-card>
                </div>
            </article>

            <article class="space-y-4 rounded-[8px] border border-[var(--app-divider)] p-4">
                <header class="text-base font-semibold">{{ t('高级活体检测材料') }}</header>
                <div class="text-sm text-[var(--app-text-muted)]">{{ t('提交认证时间') }}：{{ detail.createTime || '--' }}</div>
                <div class="grid gap-4 md:grid-cols-[1fr_360px]">
                    <a-card :title="t('自拍')">
                        <div class="flex justify-center">
                            <a-image v-if="detail.faceUri" :src="detail.faceUri" width="300" />
                            <a-empty v-else />
                        </div>
                    </a-card>
                    <a-alert
                        :type="getStatusMeta(detail.faceAnswer).type"
                        :title="getStatusMeta(detail.faceAnswer).title"
                    >
                        <template #description>
                            <div class="space-y-2">
                                <a-tag v-if="detail.rejectLabels" color="red">{{ detail.rejectLabels }}</a-tag>
                                <div>{{ getStatusMeta(detail.faceAnswer).description }}</div>
                            </div>
                        </template>
                    </a-alert>
                </div>
            </article>

            <footer>
                <a-button type="primary" @click="handleBack">{{ t('返回') }}</a-button>
            </footer>
        </template>
    </section>
</template>
