<script setup lang="ts">
import api from '@/api/examine';

const { t } = useI18n();

interface ApprovalProps {
    amount: string;
    id: string;
}

type ApprovalFlow = PromiseReturnType<typeof api.getEnterpriseTransferConfig>[number];
type ApprovalUser = ApprovalFlow['checkReqList'][number];

const props = withDefaults(defineProps<ApprovalProps>(), {
    amount: '',
    id: '',
});

const flowArr = ref<ApprovalFlow[]>([]); // 审批流数组

const fetchFlowInfo = (): void => {
    if (props.id && props.amount) {
        api.getEnterpriseTransferConfig({ coinId: props.id, amount: props.amount }).then((r) => {
            flowArr.value = r;
        }).catch(() => {
            flowArr.value = [];
        });
    }
};

const formatFlow = computed<ApprovalUser[]>(() => flowArr.value[0]?.checkReqList ?? []);

watch(() => props.id, (value) => {
    if (value) fetchFlowInfo();
}, { immediate: true });

defineExpose({ fetchFlowInfo });
</script>

<template>
    <div>
        <div v-if="formatFlow.length">
            <div v-if="props.amount">
                <div class="flex flex-row items-center">
                    <div class="flex flex-row text-xs">
                        <div class="flex flex-col items-center">
                            <span class="h-[10px] w-[10px] rounded-full bg-[var(--color-primary-6)]"></span>
                            <span class="mt-1.5 w-10 truncate text-center text-[12px] text-[var(--app-text-muted)]">{{ t('发起') }}</span>
                        </div>
                        <div class="mt-1 mx-[6px] h-px w-5 bg-[var(--color-primary-6)]"></div>
                    </div>
                    <div
                        v-for="(item, i) of formatFlow"
                        :key="i"
                        class="flex flex-row text-xs"
                    >
                        <div class="flex flex-col items-center">
                            <span class="h-[10px] w-[10px] rounded-full bg-[var(--color-primary-6)]"></span>
                            <a-tooltip placement="topLeft" :title="item.checkUserName">
                                <span
                                    class="mt-1.5 w-10 truncate text-center text-[12px] text-[var(--app-text-muted)]"
                                    :title="item.checkUserName"
                                >
                                    {{ item.checkUserName || '1' }}
                                </span>
                            </a-tooltip>
                        </div>
                        <div class="mt-1 mx-[6px] h-px w-5 bg-[var(--color-primary-6)]"></div>
                    </div>
                    <div class="flex flex-row text-xs">
                        <div class="flex flex-col items-center">
                            <span class="h-[10px] w-[10px] rounded-full bg-[var(--color-primary-6)]"></span>
                            <span class="mt-1.5 w-10 truncate text-center text-[12px] text-[var(--app-text-muted)]">{{ t('结束') }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <span v-else class="text-[var(--app-text-muted)]">{{ t('填入转账金额后，显示对应审批流程') }}</span>
        </div>
        <span v-else>--</span>
    </div>
</template>
