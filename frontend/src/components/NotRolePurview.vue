<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const targetPath = computed(() => {
    const redirect = route.query.redirect
    return typeof redirect === 'string' && redirect ? redirect : ''
})

const targetRole = computed(() => {
    const role = route.query.role
    return typeof role === 'string' && role ? role : ''
})

const description = computed(() => {
    if (targetPath.value && targetRole.value) {
        return t('暂无该页面权限，请联系管理员开通后再访问')
    }

    return t('暂无权限，请咨询管理员')
})

const handleBack = (): void => {
    const historyBack = window.history.state?.back

    if (historyBack && historyBack !== targetPath.value) {
        router.back()
        return
    }

    router.replace('/')
}

const handleGoHome = (): void => {
    router.replace('/')
}
</script>

<template>
    <div class="router-view-wrap flex flex-col items-center justify-center gap-5 px-4 py-24">
        <a-empty :description="description">
            <template #extra>
                <div class="flex flex-wrap justify-center gap-3">
                    <a-button @click="handleBack">
                        {{ t('返回') }}
                    </a-button>
                    <a-button type="primary" @click="handleGoHome">
                        {{ t('回首页') }}
                    </a-button>
                </div>
            </template>
        </a-empty>
    </div>
</template>
