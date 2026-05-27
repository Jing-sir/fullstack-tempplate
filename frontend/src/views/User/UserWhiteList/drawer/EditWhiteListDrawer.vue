<script setup lang="ts">
import whiteListApi from '@/api/whiteList'
import { commonLevelEnumMap } from '@/enums/whitelistEnum'
import { transMapBySelectOptions } from '@/utils/component'
import { Message } from '@arco-design/web-vue'
import { NINETEEN_DIGITS } from '@/utils/constant'

interface WhitelistFormState {
    accountId: string
    ditchCardIds: string[]
    kycLevelRequired: number | ''
    kycLevelMock: number | ''
}

interface WhiteListRowSource {
    id?: string
    accountId?: string
    ditchCardIds?: string
    kycLevelRequired?: number
    kycLevelMock?: number
    businessType?: string
}

interface EditWhiteListModalExpose {
    open: (source?: WhiteListRowSource) => void
    close: () => void
}

const { t } = useI18n()

const emit = defineEmits<{
    success: []
}>()

const visible = ref(false)
const saveLoading = ref(false)
const source = ref<WhiteListRowSource | null>(null)
const userEmail = ref('')

/**
 * 业务类型选项由后端下发，避免前端硬编码业务字典。
 */
const businessOptions = ref<Array<{ label: string; value: string }>>([])

const levelOptions = computed(() =>
    transMapBySelectOptions(
        commonLevelEnumMap,
        (value, item) => ({ label: item.label, value: value as number }),
    ),
)

const formState = reactive<WhitelistFormState>({
    accountId: '',
    ditchCardIds: [],
    kycLevelRequired: '',
    kycLevelMock: '',
})

const uidCache = new Map<string, string>()
const uidNotFoundSet = new Set<string>()

const getTitle = computed(() =>
    source.value?.id ? t('编辑白名单用户') : t('新增白名单用户'),
)

/**
 * 每次弹窗打开都刷新业务类型列表，保证配置更新后页面立刻可用。
 */
const queryBusinessOptions = async (): Promise<void> => {
    const result = await whiteListApi.fetchWhitelistBusList()
    businessOptions.value = result.map((item) => ({
        label: item.name,
        value: item.id,
    }))
}

/**
 * UID 校验采用“前端格式 + 后端存在性”双重校验：
 * 1. 先用正则拦截明显错误输入
 * 2. 再调用后端接口确认 UID 已注册并获取邮箱
 */
const queryUidEmail = async (): Promise<boolean> => {
    const accountId = formState.accountId.trim()

    if (!accountId) {
        Message.warning(t('请输入UID'))
        userEmail.value = ''
        return false
    }

    if (!NINETEEN_DIGITS.test(accountId)) {
        Message.warning(t('请正确输入UID'))
        userEmail.value = ''
        return false
    }

    if (uidNotFoundSet.has(accountId)) {
        Message.warning(t('该用户未注册'))
        userEmail.value = ''
        return false
    }

    const cacheValue = uidCache.get(accountId)
    if (cacheValue) {
        userEmail.value = cacheValue
        return true
    }

    const result = await whiteListApi.fetchUidById(accountId)

    if (!result) {
        uidNotFoundSet.add(accountId)
        userEmail.value = ''
        Message.warning(t('该用户未注册'))
        return false
    }

    uidCache.set(accountId, result)
    userEmail.value = result
    return true
}

const resetForm = (): void => {
    source.value = null
    userEmail.value = ''
    formState.accountId = ''
    formState.ditchCardIds = []
    formState.kycLevelRequired = ''
    formState.kycLevelMock = ''
}

const close = (): void => {
    visible.value = false
    resetForm()
}

const open = (record?: WhiteListRowSource): void => {
    resetForm()
    visible.value = true

    if (!record) return

    source.value = record
    formState.accountId = String(record.accountId || '')
    formState.ditchCardIds = String(record.ditchCardIds || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    formState.kycLevelRequired = Number.isFinite(record.kycLevelRequired)
        ? Number(record.kycLevelRequired)
        : ''
    formState.kycLevelMock = Number.isFinite(record.kycLevelMock)
        ? Number(record.kycLevelMock)
        : ''
}

/**
 * 提交前做最小必要校验，避免无效请求打到后端。
 */
const validateBeforeSubmit = async (): Promise<boolean> => {
    const hasUid = await queryUidEmail()
    if (!hasUid) return false

    if (!formState.ditchCardIds.length) {
        Message.warning(t('请选择业务类型'))
        return false
    }

    if (formState.kycLevelRequired === '') {
        Message.warning(t('请选择赦免认证等级'))
        return false
    }

    if (formState.kycLevelMock === '') {
        Message.warning(t('请选择模拟认证等级'))
        return false
    }

    return true
}

const handleSave = async (): Promise<void> => {
    const valid = await validateBeforeSubmit()
    if (!valid) return

    const payload: Record<string, unknown> = {
        accountId: formState.accountId.trim(),
        ditchCardIds: formState.ditchCardIds.join(','),
        kycLevelRequired: Number(formState.kycLevelRequired),
        kycLevelMock: Number(formState.kycLevelMock),
        type: 1,
    }

    if (source.value?.id) {
        payload.id = source.value.id
    }

    saveLoading.value = true
    try {
        if (source.value?.id) {
            await whiteListApi.fetchUpdateWhitelist(payload)
        } else {
            await whiteListApi.fetchAddWhitelist(payload)
        }

        Message.success(t('操作成功'))
        emit('success')
        close()
    } finally {
        saveLoading.value = false
    }
}

watch(
    () => visible.value,
    (value) => {
        if (!value) return
        queryBusinessOptions().catch(() => {
            Message.error(t('加载失败，请稍后重试'))
        })
    },
)

defineExpose<EditWhiteListModalExpose>({
    open,
    close,
})
</script>

<template>
    <a-drawer
        v-model:visible="visible"
        :title="getTitle"
        :width="480"
        :ok-text="t('确认')"
        :cancel-text="t('取消')"
        :confirm-loading="saveLoading"
        @ok="handleSave"
        @cancel="close"
    >
        <a-form layout="vertical" :model="formState">
            <a-form-item :label="t('UID')" required>
                <a-input
                    v-model="formState.accountId"
                    :placeholder="t('请输入UID')"
                    allow-clear
                    @blur="queryUidEmail"
                />
                <div v-if="userEmail" class="mt-2 text-xs text-[var(--app-text-muted)]">
                    {{ t('注册邮箱') }}：{{ userEmail }}
                </div>
            </a-form-item>

            <a-form-item :label="t('业务类型')" required>
                <a-select
                    v-model="formState.ditchCardIds"
                    :placeholder="t('请选择业务类型')"
                    :options="businessOptions"
                    multiple
                    allow-search
                    allow-clear
                />
            </a-form-item>

            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <a-form-item :label="t('赦免认证等级')" required>
                    <a-select
                        v-model="formState.kycLevelRequired"
                        :placeholder="t('请选择赦免认证等级')"
                        :options="levelOptions"
                        allow-clear
                    />
                </a-form-item>

                <a-form-item :label="t('模拟认证等级')" required>
                    <a-select
                        v-model="formState.kycLevelMock"
                        :placeholder="t('请选择模拟认证等级')"
                        :options="levelOptions"
                        allow-clear
                    />
                </a-form-item>
            </div>
        </a-form>
    </a-drawer>
</template>
