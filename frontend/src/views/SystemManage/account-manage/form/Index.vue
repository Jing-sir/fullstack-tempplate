<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import type { SystemRoleItem } from '@/interface/SystemManageType'
import sysAccountApi from '@/api/sys/account'
import sysRoleApi from '@/api/sys/role'
import NProgress from 'nprogress'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const tagsViewStore = tagsView()

const formRef = ref<FormInstance>()
const isLoading = ref(false)
const roleList = ref<SystemRoleItem[]>([])

// 新增与编辑复用同一份表单状态：
// - userId 为空时表示新增
// - userId 有值时表示编辑，并在 mounted 后自动回填详情
const currState = reactive({
    account: '',
    fullName: '',
    roleId: undefined as string | undefined,
    state: 1,
    userId: '',
})

const rules: Record<string, FieldRule[]> = {
    account: [{ required: true, message: t('请输入'), trigger: 'blur' }],
    fullName: [{ required: true, message: t('请输入'), trigger: 'blur' }],
    roleId: [{ required: true, message: t('请选择'), trigger: 'change' }],
}

const handleBack = (): void => {
    router.back()
    if (route.name) {
        tagsViewStore.deleteVisitedViewByName(String(route.name), true)
    }
}

/**
 * 保存逻辑统一走“先校验 -> 再提交 -> 成功后返回列表”。
 * 通过 finally 统一收口 loading / 进度条，避免异常分支遗漏状态恢复。
 */
const handleSaveData = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors) return

    NProgress.start()
    isLoading.value = true

    try {
        const { userId: id, ...params } = currState
        await sysAccountApi.sysUserAddOrUpdate({ ...params, id })
        Message.success(t('操作成功'))
        handleBack()
    } finally {
        NProgress.done()
        isLoading.value = false
    }
}

/**
 * 角色下拉选项统一在页面初始化时加载一次，
 * 避免把角色枚举散落在页面内硬编码。
 */
const fetchRoleList = async (): Promise<void> => {
    roleList.value = await sysRoleApi.sysRoleList()
}

/**
 * 编辑场景回填详情：仅当 userId 存在时请求。
 */
const fetchRowDetail = async (): Promise<void> => {
    if (!currState.userId) return

    NProgress.start()
    try {
        const data = await sysAccountApi.sysUserInfo({ userId: currState.userId })
        currState.account = data.account
        currState.fullName = data.fullName
        currState.roleId = data.roleId
        currState.state = data.state
    } finally {
        NProgress.done()
    }
}

onMounted(async () => {
    currState.userId = route.params.id ? String(route.params.id) : ''
    await fetchRoleList()
    await fetchRowDetail()
})
</script>

<template>
    <div class="table-container">
        <a-form
            ref="formRef"
            :model="currState"
            :rules="rules"
            layout="vertical"
            class="max-w-xl space-y-2"
        >
            <a-form-item :label="t('账号登录名')" field="account">
                <a-input
                    v-model="currState.account"
                    size="small"
                    class="w-[250px]"
                    autocomplete="off"
                    :disabled="Boolean(currState.userId)"
                    :placeholder="t('请输入')"
                />
            </a-form-item>

            <a-form-item :label="t('姓名')" field="fullName">
                <a-input
                    v-model="currState.fullName"
                    size="small"
                    class="w-[250px]"
                    autocomplete="off"
                    :placeholder="t('请输入')"
                />
            </a-form-item>

            <a-form-item :label="t('分配角色')" field="roleId">
                <a-select
                    v-model="currState.roleId"
                    size="small"
                    class="w-[250px]"
                    :placeholder="t('请选择')"
                >
                    <a-option v-for="item in roleList" :key="item.roleId" :value="item.roleId">
                        {{ item.roleName }}
                    </a-option>
                </a-select>
            </a-form-item>

            <a-form-item :label="t('账号状态')" field="state">
                <a-radio-group v-model="currState.state" type="button" size="small">
                    <a-radio :value="1">{{ t('启用') }}</a-radio>
                    <a-radio :value="2">{{ t('禁用') }}</a-radio>
                </a-radio-group>
            </a-form-item>

            <a-form-item>
                <div class="flex items-center gap-3 pt-6">
                    <a-button size="small" @click.stop="handleBack">
                        {{ t('取消') }}
                    </a-button>
                    <a-button
                        type="primary"
                        size="small"
                        :loading="isLoading"
                        @click.stop="handleSaveData"
                    >
                        {{ t('提交') }}
                    </a-button>
                </div>
            </a-form-item>
        </a-form>
    </div>
</template>
