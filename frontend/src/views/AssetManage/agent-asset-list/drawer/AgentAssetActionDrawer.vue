<template>
    <!--
        代理商资产操作弹窗：
        - type='Frozen'   -> 冻结操作（代理商资产扣减到冻结）
        - type='Thaw'     -> 解冻操作（冻结余额释放回可用）
        - type='Transfer' -> 划转操作（携带币种/代理商ID/卡号/备注）
    -->
    <a-drawer
        v-model:visible="visibleProxy"
        :title="modalTitle"
        :width="480"
        :confirm-loading="submitting"
        :mask-closable="false"
        @cancel="handleClose"
        @ok="handleSubmit"
    >
        <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical">
            <!-- 划转特有字段 -->
            <template v-if="type === 'Transfer'">
                <a-form-item :label="t('币种')" field="coinId">
                    <a-input v-model="formState.coinId" :placeholder="t('请输入币种ID')" />
                </a-form-item>
                <a-form-item :label="t('代理商ID')" field="agentId">
                    <a-input v-model="formState.agentId" :placeholder="t('请输入')" disabled />
                </a-form-item>
                <a-form-item :label="t('卡号')" field="cardNo">
                    <a-input v-model="formState.cardNo" :placeholder="t('请输入')" />
                </a-form-item>
                <a-form-item :label="t('备注')" field="remarks">
                    <a-textarea v-model="formState.remarks" :placeholder="t('备注最多100字')" :max-length="100" show-word-limit :auto-size="{ minRows: 3 }" />
                </a-form-item>
            </template>

            <!-- 冻结/解冻公共字段 -->
            <a-form-item
                :label="t('数量')"
                field="amount"
                :extra="t('数量不得大于{max}', { max: maxAmount })"
            >
                <a-input-number
                    v-model="formState.amount"
                    :placeholder="t('请输入')"
                    :min="0"
                    :max="maxAmount"
                    style="%"
                />
            </a-form-item>
        </a-form>
    </a-drawer>
</template>

<script lang="ts" setup>
import { Message } from '@arco-design/web-vue';
import type { FormInstance } from '@arco-design/web-vue';
import assetApi from '@/api/userApi/asset/index';
import type { AgentAssetItem } from '@/api/userApi/asset/index';

const { t } = useI18n();

const props = defineProps<{
    visible: boolean;
    /** Frozen=冻结 / Thaw=解冻 / Transfer=划转 */
    type: 'Frozen' | 'Thaw' | 'Transfer';
    activeData: AgentAssetItem;
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
const modalTitle = computed(() => {
    const typeMap = { Frozen: t('冻结'), Thaw: t('解冻'), Transfer: t('划转') };
    return `${t('资金')}${typeMap[props.type]}-${props.activeData?.id ?? ''}`;
});

// ─── 可填写的最大数量（冻结看可用余额，解冻看已冻结余额） ──────────────────────────────
const maxAmount = computed(() => {
    if (props.type === 'Frozen') return props.activeData?.balance ?? 0;
    if (props.type === 'Thaw') return props.activeData?.frozenBalance ?? 0;
    return props.activeData?.balance ?? 0;
});

// ─── 表单状态 ──────────────────────────────────────────────────────────────────
const defaultForm = () => ({
    id: '',
    coinId: '',
    agentId: '',
    cardNo: '',
    remarks: '',
    amount: '' as string | number,
});
const formState = reactive(defaultForm());
const formRef = ref<FormInstance>();

// ─── 表单校验规则 ──────────────────────────────────────────────────────────────
const formRules = computed(() => ({
    amount: [{ required: true, message: t('请输入') }],
    cardNo: props.type === 'Transfer' ? [{ required: true, message: t('请输入') }] : [],
    remarks: props.type === 'Transfer' ? [{ required: true, message: t('请输入') }] : [],
    coinId: props.type === 'Transfer' ? [{ required: true, message: t('请选择') }] : [],
}));

// ─── 弹窗打开时回填数据 ────────────────────────────────────────────────────────
watch(
    () => props.visible,
    (n) => {
        if (n) {
            Object.assign(formState, defaultForm(), {
                id: props.activeData?.id ?? '',
                agentId: props.activeData?.agentId ?? '',
                coinId: props.activeData?.symbol ?? '',
            });
        }
    },
    { immediate: true },
);

// ─── 提交逻辑 ──────────────────────────────────────────────────────────────────
const submitting = ref(false);

const handleSubmit = async () => {
    if (submitting.value) return;
    const valid = await formRef.value?.validate();
    if (valid) return; // arco validate：有错误返回 errors 对象，否则返回 undefined

    submitting.value = true;
    const request = props.type === 'Frozen'
        ? assetApi.freezeAgentAsset({ id: formState.id, amount: String(formState.amount) })
        : props.type === 'Thaw'
            ? assetApi.thawAgentAsset({ id: formState.id, amount: String(formState.amount) })
            : assetApi.transferAgentAsset({
                id: formState.id,
                coinId: formState.coinId,
                agentId: formState.agentId,
                cardNo: formState.cardNo,
                remarks: formState.remarks,
                amount: String(formState.amount),
            });
    await request.finally(() => { submitting.value = false; });
    Message.success(t('操作成功'));
    emit('success');
    handleClose();
};

const handleClose = () => {
    formRef.value?.resetFields();
    emit('close');
};
</script>