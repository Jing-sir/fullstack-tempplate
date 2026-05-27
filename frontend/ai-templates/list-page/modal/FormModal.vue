<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import exampleApi from '@/api/example'
import type { ExampleItem } from '@/api/example'

const props = defineProps<{
    visible: boolean
    activeRecord?: ExampleItem | null
}>()

const emit = defineEmits<{
    close: []
    success: []
}>()

const { t } = useI18n()

const formRef = ref<FormInstance | null>(null)
const submitLoading = ref(false)

const formState = reactive({
    id: '',
    name: '',
    state: 1 as 1 | 2,
})

const isEdit = computed(() => Boolean(props.activeRecord?.id))
const title = computed(() => (isEdit.value ? t('编辑示例') : t('新增示例')))

const rules = computed<Record<string, FieldRule[]>>(() => ({
    name: [{ required: true, message: t('请输入示例名称'), trigger: 'blur' }],
    state: [{ required: true, message: t('请选择状态'), trigger: 'change' }],
}))

watch(
    () => props.activeRecord,
    (record) => {
        formState.id = record?.id ?? ''
        formState.name = record?.name ?? ''
        formState.state = (record?.state === 2 ? 2 : 1) as 1 | 2
    },
    { immediate: true },
)

const handleClose = (): void => {
    emit('close')
}

const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors) return

    // 提交期间锁定确认按钮；成功后必须给用户反馈并通知父页面刷新。
    submitLoading.value = true
    await exampleApi
        .saveItem({
            id: formState.id,
            name: formState.name.trim(),
            state: formState.state,
        })
        .finally(() => {
            submitLoading.value = false
        })

    Message.success(t('操作成功'))
    emit('success')
    emit('close')
}
</script>

<template>
    <a-drawer
        :visible="props.visible"
        :title="title"
        width="50vw"
        :ok-text="t('确认')"
        :cancel-text="t('取消')"
        :confirm-loading="submitLoading"
        :mask-closable="false"
        @ok="handleSubmit"
        @cancel="handleClose"
        @close="handleClose"
    >
        <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
            <a-form-item :label="t('示例名称')" field="name" required>
                <a-input v-model="formState.name" :placeholder="t('请输入')" allow-clear />
            </a-form-item>

            <a-form-item :label="t('状态')" field="state" required>
                <a-select v-model="formState.state" :placeholder="t('请选择')">
                    <a-option :value="1">{{ t('启用') }}</a-option>
                    <a-option :value="2">{{ t('禁用') }}</a-option>
                </a-select>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>
