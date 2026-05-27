<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { debounce } from 'lodash-es'
import tagApi from '@/api/userApi/tag'
import { colorArr } from '@/utils/constant'

type LabelFormMode = 'add' | 'edit' | 'view'

interface LabelFormModalExpose {
    open: (mode: LabelFormMode, source?: { id?: string }) => void
    close: () => void
}

interface TagAccountOption {
    id: string
    labelCount: number
}

interface TagDetailResponse {
    id?: string
    name?: string
    color?: string
    sort?: number | string
    accountIds?: string
}

const { t } = useI18n()

const emit = defineEmits<{
    success: []
}>()

const formRef = ref<FormInstance>()
const visible = ref(false)
const submitLoading = ref(false)
const userQueryLoading = ref(false)
const mode = ref<LabelFormMode>('add')

const formState = reactive({
    id: '',
    name: '',
    color: '',
    sort: 1 as number | null,
    accountIds: [] as string[],
})

const userOptions = ref<TagAccountOption[]>([])

const isView = computed(() => mode.value === 'view')

const title = computed(() => {
    if (mode.value === 'add') return t('新增标签')
    if (mode.value === 'edit') return t('编辑标签')
    return t('查看')
})

const rules: Record<string, FieldRule[]> = {
    name: [
        { required: true, message: t('请输入标签名称'), trigger: 'blur' },
    ],
    color: [
        { required: true, message: t('请选择标签颜色'), trigger: 'change' },
    ],
    sort: [
        { required: true, message: t('请输入标签排序'), trigger: 'blur' },
    ],
    accountIds: [
        { required: true, message: t('请选择包含用户'), trigger: 'change' },
    ],
}

const selectableUsers = computed(() =>
    userOptions.value.map((item) => ({
        value: item.id,
        label: item.id,
        disabled: item.labelCount >= 10,
    })),
)

const resetForm = (): void => {
    formState.id = ''
    formState.name = ''
    formState.color = ''
    formState.sort = 1
    formState.accountIds = []
    formRef.value?.resetFields()
}

/**
 * 合并用户选项：
 * 1. 保留已存在选项
 * 2. 新结果按 id 去重覆盖
 */
const mergeUserOptions = (source: unknown[]): void => {
    const optionMap = new Map(
        userOptions.value.map((item) => [item.id, item]),
    )

    source.forEach((rawItem) => {
        const item = rawItem as Record<string, unknown>
        const optionId = String(item.id ?? item.accountId ?? '')

        if (!optionId) return

        optionMap.set(optionId, {
            id: optionId,
            labelCount: Number(item.labelCount ?? item.labelsCount ?? 0),
        })
    })

    userOptions.value = Array.from(optionMap.values())
}

/**
 * 获取“包含用户”下拉：
 * - 不带参数：拉取默认可选用户列表
 * - 带 accountId：按 UID 关键字补充检索结果
 */
const queryTagUsers = async (accountId = ''): Promise<void> => {
    userQueryLoading.value = true
    await tagApi.getTagAccountList(
        accountId ? { accountId } : undefined,
    ).then((list) => {
        mergeUserOptions(Array.isArray(list) ? list : [])
    }).finally(() => { userQueryLoading.value = false })
}

/**
 * 查询标签详情并回填编辑态数据。
 */
const queryTagDetail = async (id: string): Promise<void> => {
    const detail = await tagApi.getTagInfo({ id }) as TagDetailResponse

    formState.id = String(detail.id ?? id)
    formState.name = String(detail.name ?? '')
    formState.color = String(detail.color || '')

    const parsedSort = Number(detail.sort)
    formState.sort = Number.isFinite(parsedSort) && parsedSort > 0
        ? parsedSort
        : 1

    formState.accountIds = String(detail.accountIds || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

    formState.accountIds.forEach((accountId) => {
        if (userOptions.value.some((item) => item.id === accountId)) {
            return
        }

        userOptions.value.push({
            id: accountId,
            labelCount: 0,
        })
    })
}

const onSearchUser = debounce((keyword: string) => {
    const normalizedKeyword = keyword.trim()
    if (!normalizedKeyword) return
    void queryTagUsers(normalizedKeyword).catch(() => undefined)
}, 300)

const close = (): void => {
    visible.value = false
    resetForm()
}

const open = (nextMode: LabelFormMode, source?: { id?: string }): void => {
    mode.value = nextMode
    resetForm()
    visible.value = true

    queryTagUsers().then(() => {
        if (!source?.id) return
        queryTagDetail(String(source.id)).catch(() => {
            Message.error(t('加载失败，请稍后重试'))
        })
    }).catch(() => {
        Message.error(t('加载失败，请稍后重试'))
    })
}

/**
 * 提交新增/编辑：
 * 1. 校验必填字段
 * 2. accountIds 统一拼成逗号串
 * 3. 成功后刷新列表
 */
const handleSubmit = async (): Promise<void> => {
    if (isView.value) {
        close()
        return
    }

    const errors = await formRef.value?.validate()
    if (errors) return

    submitLoading.value = true
    await tagApi.saveTag({
        id: formState.id,
        name: formState.name.trim(),
        color: formState.color,
        sort: Number(formState.sort || 1),
        accountIds: formState.accountIds.join(','),
        createBy: '',
    }).finally(() => { submitLoading.value = false })

    Message.success(t('操作成功'))
    emit('success')
    close()
}

defineExpose<LabelFormModalExpose>({
    open,
    close,
})
</script>

<template>
    <a-drawer
        v-model:visible="visible"
        :title="title"
        :width="480"
        :ok-text="isView ? t('确认') : t('确认')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        :mask-closable="false"
        @ok="handleSubmit"
        @cancel="close"
    >
        <p class="mb-3 text-xs text-[var(--app-text-muted)]">
            {{ t('单个用户最多关联10个标签，超限用户将无法继续关联新标签') }}
        </p>

        <a-form
            ref="formRef"
            :model="formState"
            :rules="rules"
            layout="vertical"
        >
            <a-form-item :label="t('标签名称')" field="name" required>
                <a-input
                    v-model="formState.name"
                    :placeholder="t('请输入标签名称')"
                    :max-length="8"
                    allow-clear
                    :disabled="isView"
                />
            </a-form-item>

            <a-form-item :label="t('标签颜色')" field="color" required>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="color in colorArr"
                        :key="color"
                        type="button"
                        class="h-6 w-6 rounded-full border-2 transition-colors"
                        :style="{
                            backgroundColor: color,
                            borderColor: formState.color === color ? 'var(--color-primary-6)' : 'transparent',
                            cursor: isView ? 'not-allowed' : 'pointer',
                        }"
                        :disabled="isView"
                        @click="formState.color = color"
                    />
                </div>
            </a-form-item>

            <a-form-item :label="t('标签排序')" field="sort" required>
                <a-input-number
                    v-model="formState.sort"
                    :min="1"
                    :max="99999999"
                    :placeholder="t('请输入标签排序')"
                    :disabled="isView"
                    class="w-full"
                />
            </a-form-item>

            <a-form-item :label="t('包含用户')" field="accountIds" required>
                <a-select
                    v-model="formState.accountIds"
                    multiple
                    allow-search
                    allow-clear
                    :disabled="isView"
                    :loading="userQueryLoading"
                    :options="selectableUsers"
                    :placeholder="t('请选择包含用户')"
                    @search="onSearchUser"
                />
            </a-form-item>
        </a-form>
    </a-drawer>
</template>
