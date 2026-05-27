# 交互模式模板

给 AI 和非前端同事看的最小规则。新增 Drawer、Dialog、确认弹窗、提示反馈时，先按这里写。

## 选择规则

| 场景 | 用法 | 不要这样 |
| --- | --- | --- |
| 新增/编辑表单 | `modal/FormModal.vue` 内用 `a-drawer` | 页面里直接堆表单 |
| 小型确认 | `useConfirmAction().confirmAndRun` | 每页手写 `Modal.confirm` |
| 成功/失败反馈 | `Message.success/error/warning(t('中文'))` | 静默成功或裸中文 |
| 详情很多 | 优先 Drawer，太复杂再建隐藏详情路由 | 大内容塞 `a-modal` |
| 浮层目录 | 放页面目录的 `modal/` | 放到 `components/` |

## 父页面打开 Drawer

```vue
<script setup lang="ts">
import FormModal from './modal/FormModal.vue'

const modalVisible = ref(false)
const activeRecord = ref<ExampleItem | null>(null)

const openCreateModal = (): void => {
    activeRecord.value = null
    modalVisible.value = true
}

const openEditModal = (record: ExampleItem): void => {
    activeRecord.value = record
    modalVisible.value = true
}

const closeModal = (): void => {
    modalVisible.value = false
}
</script>

<template>
    <FormModal
        v-if="modalVisible"
        :visible="modalVisible"
        :active-record="activeRecord"
        @close="closeModal"
        @success="tableRef?.refresh()"
    />
</template>
```

## Drawer 表单提交

完整模板见 `ai-templates/list-page/modal/FormModal.vue`。核心约定：

```ts
const submitLoading = ref(false)

const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors) return

    submitLoading.value = true
    await exampleApi.saveItem(formState).finally(() => {
        submitLoading.value = false
    })

    Message.success(t('操作成功'))
    emit('success')
    emit('close')
}
```

## 二次确认

```ts
const { confirmAndRun } = useConfirmAction()

const handleDelete = (record: ExampleItem): void => {
    confirmAndRun({
        content: t('确认删除该记录吗？'),
        onOk: async () => {
            await exampleApi.deleteItem({ id: record.id })
            Message.success(t('删除成功'))
            await tableRef.value?.refresh()
        },
    })
}
```

## 普通提示

```ts
Message.success(t('操作成功'))
Message.error(t('操作失败'))
Message.warning(t('请先选择数据'))
```

提示文案要同步到 `src/lang/zh-CN.json` 和 `src/lang/en-US.json`。
