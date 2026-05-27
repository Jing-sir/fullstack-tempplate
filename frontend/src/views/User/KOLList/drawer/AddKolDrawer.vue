<script setup lang="ts">
import kolApi from '@/api/kolConfiguration/index'
import accountListApi from '@/api/userApi/account/list'
import kolInfluencerApi from '@/api/userApi/kolInfluencer'
import { Message } from '@arco-design/web-vue'

interface AddKolModalProps {
    visible: boolean
}

interface AccountBriefInfo {
    accountId: string
    email: string
    globalCode: string
    phone: string
    surname: string
    name: string
    invitationCode: string
    userTypeName: string
    userType: number | null
    labelName: string
    advancedAuthStateName: string
    authStateName: string
}

const props = defineProps<AddKolModalProps>()
const emit = defineEmits<{
    'update:visible': [value: boolean]
    success: []
}>()

const { t } = useI18n()

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
})

const uidLoading = ref(false)
const submitLoading = ref(false)
const formState = reactive({ accountId: '' })

const emptyInfoState: AccountBriefInfo = {
    accountId: '',
    email: '',
    globalCode: '',
    phone: '',
    surname: '',
    name: '',
    invitationCode: '',
    userTypeName: '',
    userType: null,
    labelName: '',
    advancedAuthStateName: '',
    authStateName: '',
}

const accountInfo = reactive<AccountBriefInfo>({ ...emptyInfoState })

const displayPhone = computed(() => {
    if (!accountInfo.phone) return '--'
    return `${accountInfo.globalCode || ''} ${accountInfo.phone}`.trim()
})

/**
 * 重置弹窗表单与回填数据，保证每次打开都是干净状态。
 */
const resetModalState = (): void => {
    formState.accountId = ''
    Object.assign(accountInfo, emptyInfoState)
}

/**
 * 将 /account/list 返回的首条用户数据映射成弹窗展示结构。
 * 这里只抽取新增 KOL 必需字段与展示字段，避免把整条对象直接透传到视图层。
 */
const patchAccountInfo = (raw: Record<string, unknown>): void => {
    accountInfo.accountId = String(raw.id ?? raw.accountId ?? formState.accountId.trim())
    accountInfo.email = String(raw.email ?? '')
    accountInfo.globalCode = String(raw.globalCode ?? '')
    accountInfo.phone = String(raw.phone ?? '')
    accountInfo.surname = String(raw.surname ?? '')
    accountInfo.name = String(raw.name ?? '')
    accountInfo.invitationCode = String(raw.invitationCode ?? '')
    accountInfo.userTypeName = String(raw.userTypeName ?? '')
    accountInfo.userType =
        typeof raw.userType === 'number'
            ? raw.userType
            : Number.isFinite(Number(raw.userType))
                ? Number(raw.userType)
                : null
    accountInfo.labelName = String(raw.labelName ?? '')
    accountInfo.advancedAuthStateName = String(raw.advancedAuthStateName ?? '')
    accountInfo.authStateName = String(raw.authStateName ?? '')
}

/**
 * 先按 UID 查询账户信息：
 * 1. 找不到用户时清空回填内容并提示
 * 2. 查到后回填“邮箱/手机号/用户类型”等信息供确认
 */
const queryAccountInfoByUid = async (): Promise<boolean> => {
    const accountId = formState.accountId.trim()

    if (!accountId) {
        Message.warning(t('请输入UID'))
        Object.assign(accountInfo, emptyInfoState)
        return false
    }

    const response = await accountListApi.getAccountList({
        accountId,
        pageNo: 1,
        pageSize: 1,
    })

    const matchedUser = Array.isArray(response.list) ? response.list[0] : null
    if (!matchedUser) {
        Object.assign(accountInfo, emptyInfoState)
        Message.warning(t('请正确输入UID'))
        return false
    }

    patchAccountInfo(matchedUser as Record<string, unknown>)
    return true
}

/**
 * 与老项目保持一致的可添加校验：
 * - 普通用户：允许直接添加
 * - 代理商用户：仅在 isAgent=true 时允许添加
 * - 其他用户类型：不允许添加
 */
const validateKolEligible = async (): Promise<boolean> => {
    const accountId = formState.accountId.trim()
    const userTypeName = accountInfo.userTypeName.trim()

    if (!accountId || !userTypeName) {
        Message.warning(t('请正确输入UID'))
        return false
    }

    if (userTypeName === '普通用户' || userTypeName === 'Regular User') {
        return true
    }

    if (userTypeName === '代理商用户' || userTypeName === 'Agent User') {
        const isAgent = await kolInfluencerApi.getKolInfluencerAgentStatus({ accountId })
        if (isAgent) return true
        Message.warning(t('该用户不是普通用户或代理商客户，不能添加'))
        return false
    }

    Message.warning(t('该用户不是普通用户或代理商客户，不能添加'))
    return false
}

/**
 * UID 失焦时执行“资料查询 + 可添加校验”，及时反馈给操作人。
 */
const handleUidBlur = async (): Promise<void> => {
    if (uidLoading.value || submitLoading.value) return

    uidLoading.value = true
    try {
        const exists = await queryAccountInfoByUid()
        if (!exists) return
        await validateKolEligible()
    } finally {
        uidLoading.value = false
    }
}

const close = (): void => {
    visibleProxy.value = false
    resetModalState()
}

/**
 * 提交新增：
 * 1. 复用同一套 UID 查询与可添加校验，避免仅靠失焦校验
 * 2. 将老项目需要的邮箱/区号/手机号随请求提交
 */
const handleSubmit = async (): Promise<void> => {
    if (submitLoading.value) return

    submitLoading.value = true
    try {
        const exists = await queryAccountInfoByUid()
        if (!exists) return

        const eligible = await validateKolEligible()
        if (!eligible) return

        await kolApi.fetchGetKolInfluencerAdd({
            accountId: formState.accountId.trim(),
            email: accountInfo.email,
            globalCode: accountInfo.globalCode,
            phone: accountInfo.phone,
        })

        Message.success(t('操作成功'))
        emit('success')
        close()
    } finally {
        submitLoading.value = false
    }
}
</script>

<template>
    <a-drawer
        v-model:visible="visibleProxy"
        :title="t('添加')"
        :width="640"
        :ok-text="t('确认')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        :mask-closable="false"
        @ok="handleSubmit"
        @cancel="close"
    >
        <a-form layout="vertical">
            <a-form-item :label="t('UID')" required>
                <a-input
                    v-model="formState.accountId"
                    :placeholder="t('请输入UID')"
                    allow-clear
                    :loading="uidLoading"
                    @blur="handleUidBlur"
                />
            </a-form-item>
        </a-form>

        <!-- 用户资料展示改为两列并排，减少弹窗纵向高度 -->
        <div class="grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('邮箱') }}：</span>
                <span>{{ accountInfo.email || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('手机号') }}：</span>
                <span>{{ displayPhone }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('姓') }}：</span>
                <span>{{ accountInfo.surname || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('名') }}：</span>
                <span>{{ accountInfo.name || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('本人邀请码') }}：</span>
                <span>{{ accountInfo.invitationCode || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('用户类型') }}：</span>
                <span>{{ accountInfo.userTypeName || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('用户标签') }}：</span>
                <span>{{ accountInfo.labelName || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('高级认证状态') }}：</span>
                <span>{{ accountInfo.advancedAuthStateName || '--' }}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-[var(--app-text-muted)]">{{ t('初级认证状态') }}：</span>
                <span>{{ accountInfo.authStateName || '--' }}</span>
            </div>
        </div>
    </a-drawer>
</template>
