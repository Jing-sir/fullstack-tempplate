<template>
    <!--
        用户资产冻结表-解冻弹窗：
        - 展示用户UID、可解冻数量（只读）
        - 解冻数量：必须 > 0 且不超过 thawAmount
        - 解冻原因：必填
        - 支持"全部"快捷填入
    -->
    <a-drawer
        v-model:visible="visibleProxy"
        :title="t('解冻资产')"
        :width="480"
        :confirm-loading="submitting"
        :mask-closable="false"
        @cancel="handleClose"
        @ok="handleSubmit"
    >
        <a-form ref="formRef" :model="formState" layout="vertical">
            <a-form-item :label="t('用户UID')">
                <span>{{ activeData?.userId }}</span>
            </a-form-item>
            <a-form-item :label="t('可解冻数量')">
                <span>{{ activeData?.thawAmount }}</span>
            </a-form-item>

            <!-- 解冻数量 -->
            <a-form-item
                :label="t('解冻数量')"
                field="amount"
                :rules="[{ required: true, validator: validateAmount }]"
            >
                <div class="flex items-center gap-2">
                    <a-input-number
                        v-model="formState.amount"
                        :placeholder="`${t('数量不得大于')}${activeData?.thawAmount}`"
                        :min="0"
                        :max="activeData?.thawAmount"
                        style="px"
                    />
                    <a-link @click="handleFillAll">{{ t('全部') }}</a-link>
                </div>
            </a-form-item>

            <!-- 解冻原因 -->
            <a-form-item
                :label="t('解冻原因')"
                field="reason"
                :rules="[{ required: true, message: t('请输入解冻原因') }]"
            >
                <a-input
                    v-model="formState.reason"
                    :placeholder="t('请输入解冻原因')"
                    style="px"
                />
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue';
import type { FormInstance } from '@arco-design/web-vue';
import assetApi from '@/api/userApi/asset/index';
import type { UserAssetFrozenItem } from '@/api/userApi/asset/index';

const { t } = useI18n();

const props = defineProps<{
    visible: boolean;
    activeData: UserAssetFrozenItem;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'close'): void;
    (e: 'success'): void;
}>();

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
});

const defaultForm = () => ({ amount: '' as string | number, reason: '' });
const formState = reactive(defaultForm());
const formRef = ref<FormInstance>();

watch(
    () => props.visible,
    (n) => {
        if (n) Object.assign(formState, defaultForm());
    },
    { immediate: true },
);

const handleFillAll = () => {
    formState.amount = props.activeData?.thawAmount ?? '';
};

const validateAmount = (_: unknown, value: string | number) => {
    const val = Number(value);
    if (val <= 0) return Promise.reject(t('请输入大于0的解冻数量'));
    if (val > Number(props.activeData?.thawAmount ?? 0)) return Promise.reject(t('输入的解冻数量不能大于可解冻数量'));
    return Promise.resolve();
};

const submitting = ref(false);
const handleSubmit = async () => {
    if (submitting.value) return;
    const errors = await formRef.value?.validate();
    if (errors) return;

    submitting.value = true;
    await assetApi.thawUserAssetManualFrozen({
        id: props.activeData.id!,
        amount: String(formState.amount),
        reason: formState.reason,
    }).finally(() => { submitting.value = false; });
    Message.success(t('操作成功'));
    emit('success');
    handleClose();
};

const handleClose = () => {
    formRef.value?.resetFields();
    emit('close');
};
</script>