<template>
    <!--
        用户资产手工冻结/解冻弹窗
        - type='Frozen' -> 手工冻结：数量不超过可用余额，支持"全部"快捷填入
        - type='Thaw'   -> 手工解冻：数量不超过风控冻结余额，支持"全部"快捷填入
    -->
    <a-drawer
        v-model:visible="visibleProxy"
        :title="`${title}${t('资产')}`"
        :width="480"
        :confirm-loading="submitting"
        :mask-closable="false"
        @cancel="handleClose"
        @ok="handleSubmit"
    >
        <a-form ref="formRef" :model="formState" layout="vertical">
            <!-- 只读信息展示 -->
            <a-form-item :label="t('用户UID')">
                <span>{{ activeData?.userId }}</span>
            </a-form-item>
            <a-form-item :label="type === 'Frozen' ? t('可用数量') : t('风控冻结数量')">
                <span>{{ type === 'Frozen' ? activeData?.balance : activeData?.manualFrozenBalance }}</span>
            </a-form-item>

            <!-- 数量输入 -->
            <a-form-item
                :label="`${title}${t('数量')}`"
                field="amount"
                :rules="[{ validator: validateAmount }]"
                required
            >
                <div class="flex items-center gap-2">
                    <a-input-number
                        v-model="formState.amount"
                        :placeholder="`${t('数量不得大于')}${maxAmount}`"
                        :min="minStep"
                        :max="maxAmount"
                        style="px"
                    />
                    <!-- 全部：一键填入最大值 -->
                    <a-link @click="handleFillAll">{{ t('全部') }}</a-link>
                </div>
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue';
import type { FormInstance } from '@arco-design/web-vue';
import assetApi from '@/api/userApi/asset/index';
import type { UserAssetItem } from '@/api/userApi/asset/index';

const { t } = useI18n();

const props = defineProps<{
    visible: boolean;
    type: 'Frozen' | 'Thaw';
    activeData: UserAssetItem;
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

// ─── 弹窗标题 ──────────────────────────────────────────────────────────────────
const title = computed(() => (props.type === 'Frozen' ? t('冻结') : t('解冻')));

// ─── 最大/最小可输入数量 ───────────────────────────────────────────────────────
const maxAmount = computed(() =>
    props.type === 'Frozen'
        ? (props.activeData?.balance ?? 0)
        : (props.activeData?.manualFrozenBalance ?? 0),
);
// 最小步长由币种精度决定；暂不依赖 currency store，用 0 作为下限
const minStep = 0;

// ─── 表单状态 ──────────────────────────────────────────────────────────────────
const formState = reactive({
    assetId: 0,
    balance: '' as string | number,
    amount: '' as string | number,
    manualFrozenBalance: '' as string | number,
    symbol: '',
});
const formRef = ref<FormInstance>();

// ─── 打开时回填数据 ────────────────────────────────────────────────────────────
watch(
    () => props.visible,
    (n) => {
        if (n) {
            Object.assign(formState, {
                assetId: Number(props.activeData?.id ?? 0),
                balance: props.activeData?.balance ?? '',
                manualFrozenBalance: props.activeData?.manualFrozenBalance ?? '',
                symbol: props.activeData?.symbol ?? '',
                amount: '',
            });
        }
    },
    { immediate: true },
);

// ─── 一键全部 ──────────────────────────────────────────────────────────────────
const handleFillAll = () => {
    formState.amount = maxAmount.value;
    formRef.value?.validateField('amount');
};

// ─── 数量校验 ──────────────────────────────────────────────────────────────────
const validateAmount = (_: unknown, value: string | number) => {
    if (!value && value !== 0) {
        return Promise.reject(t('请输入'));
    }
    return Promise.resolve();
};

// ─── 提交 ──────────────────────────────────────────────────────────────────────
const submitting = ref(false);

const handleSubmit = async () => {
    if (submitting.value) return;
    const errors = await formRef.value?.validate();
    if (errors) return;

    submitting.value = true;
    try {
        if (props.type === 'Frozen') {
            await assetApi.freezeUserAsset({
                assetId: formState.assetId,
                balance: String(formState.balance),
                amount: String(formState.amount),
                manualFrozenBalance: String(formState.manualFrozenBalance),
                symbol: formState.symbol,
            });
        } else {
            await assetApi.unfreezeUserAsset({
                assetId: formState.assetId,
                balance: String(formState.balance),
                amount: String(formState.amount),
                symbol: formState.symbol,
            });
        }
        Message.success(t('操作成功'));
        emit('success');
        handleClose();
    } finally {
        submitting.value = false;
    }
};

const handleClose = () => {
    formRef.value?.resetFields();
    emit('close');
};
</script>