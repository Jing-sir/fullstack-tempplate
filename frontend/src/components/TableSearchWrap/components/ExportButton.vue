<script setup lang="ts">
import dayjs from 'dayjs';
import { Message } from '@arco-design/web-vue';
import type { TableExportConfig } from '@/interface/TableType';
import PermissionButton from './PermissionButton.vue';

interface ExportButtonProps {
    config: TableExportConfig;
    params?: Record<string, unknown>;
}

const props = withDefaults(defineProps<ExportButtonProps>(), {
    params: () => ({}),
});

const { t } = useI18n();
const loading = ref(false);

const resolveFileName = (): string => {
    if (props.config.fileName) return props.config.fileName;
    return `${t('导出')}-${dayjs().format('YYYY-MM-DD HH:mm:ss')}.xlsx`;
};

/**
 * 前端通用 Blob 下载逻辑。
 * 统一在组件内封装，避免每个列表页重复写下载代码。
 */
const downloadBlob = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * 导出流程：
 * 1. 用当前搜索条件+分页生成导出参数
 * 2. 可选 beforeExport 拦截
 * 3. 调用导出接口并触发文件下载
 */
const handleExport = async (): Promise<void> => {
    if (loading.value) return;

    const baseParams = { ...props.params };
    const exportParams = props.config.buildParams
        ? props.config.buildParams(baseParams)
        : baseParams;

    if (props.config.beforeExport) {
        const canExport = await props.config.beforeExport(exportParams);
        if (!canExport) return;
    }

    loading.value = true;
    try {
        const blob = await props.config.exportApi(exportParams);
        downloadBlob(blob, resolveFileName());
        Message.success(t('导出成功'));
    } catch (error) {
        console.error(error);
        Message.error(t('导出失败，请稍后重试'));
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <PermissionButton
        :button-key="props.config.buttonKey || 'export'"
        type="primary"
        :disabled="props.config.disabled"
        :loading="loading"
        @click="handleExport"
    >
        {{ t(props.config.buttonText || '导出') }}
    </PermissionButton>
</template>
