<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import tagApi from '@/api/userApi/tag'

interface ImportTagsModalProps {
    visible: boolean
}

interface ImportFailRow {
    name: string
    color: string
    accountIds: string
    failReason: string
}

const props = defineProps<ImportTagsModalProps>()

const emit = defineEmits<{
    'update:visible': [value: boolean]
    success: []
}>()

const { t } = useI18n()

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const importLoading = ref(false)
const templateLoading = ref(false)
const uploadStatus = ref<'idle' | 'success' | 'error'>('idle')
const failedRows = ref<ImportFailRow[]>([])

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
})

const failedColumns = computed(() => [
    { title: t('标签名称'), dataIndex: 'name' },
    { title: t('标签颜色'), dataIndex: 'color' },
    { title: t('包含用户'), dataIndex: 'accountIds', ellipsis: true },
    { title: t('失败原因'), dataIndex: 'failReason' },
])

const getFailRowKey = (record: ImportFailRow, index: number): string =>
    `${record.name || '--'}-${record.accountIds || '--'}-${index}`

/**
 * 统一 Blob 下载能力，复用导入模板下载与后续扩展场景。
 */
const downloadBlob = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

const resetState = (): void => {
    selectedFile.value = null
    uploadStatus.value = 'idle'
    failedRows.value = []

    if (fileInputRef.value) {
        fileInputRef.value.value = ''
    }
}

const close = (): void => {
    visibleProxy.value = false
    resetState()
}

const openFileSelector = (): void => {
    fileInputRef.value?.click()
}

const handleFileChange = (event: Event): void => {
    const inputElement = event.target as HTMLInputElement
    const file = inputElement.files?.[0]

    if (!file) return

    const lowerCaseFileName = file.name.toLowerCase()
    const isExcelFile = lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')

    if (!isExcelFile) {
        selectedFile.value = null
        uploadStatus.value = 'error'
        failedRows.value = []
        Message.error(t('只能上传Excel文件'))
        return
    }

    selectedFile.value = file
    uploadStatus.value = 'success'
    failedRows.value = []
    Message.success(t('上传成功'))
}

const normalizeFailedRows = (payload: unknown): ImportFailRow[] => {
    if (!Array.isArray(payload)) {
        return []
    }

    return payload.map((item) => {
        const source = item as Record<string, unknown>

        return {
            name: String(source.name || ''),
            color: String(source.color || ''),
            accountIds: String(source.accountIds || ''),
            failReason: String(source.failReason || ''),
        }
    })
}

const handleDownloadTemplate = async (): Promise<void> => {
    if (templateLoading.value) return

    templateLoading.value = true
    try {
        const blob = await tagApi.getTagImportTemplate()
        downloadBlob(blob, `${t('用户多标签模版')}.xlsx`)
    } finally {
        templateLoading.value = false
    }
}

/**
 * 导入逻辑：
 * 1. 校验文件存在且为 Excel
 * 2. 上传导入
 * 3. 将接口返回的失败明细渲染到下方表格
 */
const handleImport = async (): Promise<void> => {
    if (!selectedFile.value) {
        Message.warning(t('请选择导入文件'))
        return
    }

    importLoading.value = true
    try {
        const result = await tagApi.importTag({ file: selectedFile.value })

        if (result === false) {
            Message.error(t('导入失败，请稍后重试'))
            return
        }

        failedRows.value = normalizeFailedRows(result)
        Message.success(t('导入解析成功'))
        emit('success')
    } finally {
        importLoading.value = false
    }
}
</script>

<template>
    <a-drawer
        v-model:visible="visibleProxy"
        :title="t('导入解析')"
        :width="640"
        :ok-text="t('确认')"
        :cancel-text="t('取消')"
        :confirm-loading="importLoading"
        :mask-closable="false"
        @ok="handleImport"
        @cancel="close"
    >
        <div class="flex flex-col gap-4">
            <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept=".xlsx,.xls"
                @change="handleFileChange"
            >

            <div class="flex flex-wrap items-center gap-3">
                <a-button @click="openFileSelector">
                    {{ t('上传文件') }}
                </a-button>

                <span
                    v-if="selectedFile"
                    class="text-sm text-[var(--app-text)]"
                >
                    {{ t('当前文件') }}：{{ selectedFile.name }}
                </span>

                <a-tag
                    v-if="uploadStatus !== 'idle'"
                    :color="uploadStatus === 'success' ? 'green' : 'red'"
                >
                    {{ t(uploadStatus === 'success' ? '上传成功' : '上传失败') }}
                </a-tag>
            </div>

            <div class="text-xs leading-5 text-[var(--app-text-muted)]">
                <span>{{ t('仅支持Excel格式，导入模版请') }}</span>
                <a-button
                    type="text"
                    size="small"
                    class="!px-1 align-baseline"
                    :loading="templateLoading"
                    @click="handleDownloadTemplate"
                >
                    {{ t('点此下载') }}
                </a-button>
            </div>

            <p class="text-xs leading-5 text-[var(--app-text-muted)]">
                {{ t('导入后解析成功的数据会更新入库，失败数据会在下方展示，请修正后再次导入') }}
            </p>
            <p class="text-xs leading-5 text-[var(--app-text-muted)]">
                {{ t('同名标签会替换其关联用户，不同名则作为新增标签入库') }}
            </p>

            <section class="rounded-[10px] border border-[var(--app-divider)] bg-[var(--app-surface-strong)] p-3">
                <h3 class="mb-2 text-sm font-semibold text-[var(--app-text)]">
                    {{ t('解析失败数据') }}
                </h3>
                <a-table
                    :columns="failedColumns"
                    :data="failedRows"
                    :pagination="false"
                    size="small"
                    :row-key="getFailRowKey"
                >
                    <template #accountIds="{ record }">
                        <a-tooltip :content="record.accountIds || '--'">
                            {{ record.accountIds || '--' }}
                        </a-tooltip>
                    </template>
                </a-table>
            </section>
        </div>
    </a-drawer>
</template>
