<script setup lang="ts">
import type { PropType } from 'vue';
import StatusText from '@/components/TableSearchWrap/components/StatusText.vue';

const { t } = useI18n();

interface ApprovalItem {
    user: string;
    checkState: number;
    checkResult: number;
}

const props = defineProps({
    flowArr: {
        type: Array as PropType<ApprovalItem[]>,
        require: true,
        default: () => [],
    },
    sendUser: { // 审核状态
        type: String,
        require: true,
        default: () => '',
    }
});
</script>

<template>
    <div>
        <div class="flex flex-row items-start">
            <div class="flex flex-row text-xs">
                <div class="flex flex-col items-center">
                    <span class="h-[10px] w-[10px] rounded-full bg-[var(--color-primary-6)]"></span>
                    <span class="mt-1.5 w-10 truncate text-center text-[12px] text-[var(--app-text-muted)]">{{ t('发起') }}</span>
                    <span v-if="props.sendUser" class="mt-1.5 w-10 truncate text-center text-[12px] text-[var(--app-text-muted)]">{{ props.sendUser }}</span>
                </div>
                <div class="mt-1 mx-[6px] h-px w-5 bg-[var(--color-primary-6)]"></div>
            </div>
            <div
                v-for="(item, i) of props.flowArr"
                :key="i"
                class="flex flex-row text-xs"
            >
                <div class="flex flex-col items-center">
                    <span class="h-[10px] w-[10px] rounded-full bg-[var(--color-primary-6)]"></span>
                    <a-tooltip placement="topLeft" :title="item.user">
                        <span class="mt-1.5 w-10 truncate text-center text-[12px] text-[var(--app-text-muted)]" :title="item.user">
                            {{ item.user || '--' }}
                        </span>
                    </a-tooltip>
                    <StatusText
                        class="mt-1.5 w-10 truncate text-center text-[12px]"
                        :value="item.checkState"
                        preset="reviewState"
                    />
                    <StatusText
                        v-if="item.checkResult === 1 || item.checkResult === 2"
                        class="mt-1.5 w-10 truncate text-center text-[12px]"
                        :value="item.checkResult"
                        preset="reviewResult"
                    />
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
</template>