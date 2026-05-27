<script setup lang="ts">
import type { SaveSwapConfigResult } from '@/api/flashExchange'
import { onCopyCode } from '@/utils/common'
import { IconExclamationCircleFill, IconCopy } from '@arco-design/web-vue/es/icon'

interface WarningModalExpose {
    open: (payload: SaveSwapConfigResult, limitRange: number, tags: TagOption[]) => void
}

interface TagOption {
    id: string | number
    name: string
    color: string
}

const { t } = useI18n()

const visible = ref(false)
const limitRange = ref(2)
const tagList = ref<TagOption[]>([])
const warningPayload = ref<SaveSwapConfigResult>({
    alreadySetLimitValue: [],
    errorLimitValue: [],
    notSetLimitValue: [],
    alreadyUserSetLimitValue: [],
    errorUserLimitValue: [],
    notSetUserLimitValue: [],
    result: true,
})

const rangeLabel = computed(() => (limitRange.value === 2 ? t('用户标签') : t('UID')))

const pickFieldValue = (type: 1 | 2 | 3): string[] => {
    const keyList = ['alreadySetLimitValue', 'errorLimitValue', 'notSetLimitValue'] as const
    const targetKey = keyList[type - 1]
    return warningPayload.value[targetKey] || []
}

const mapTagNames = (ids: string[]): string[] => {
    const tagNameMap = new Map(tagList.value.map((item) => [String(item.id), String(item.name || '')]))
    return ids.map((id) => tagNameMap.get(String(id)) || String(id))
}

/**
 * 根据范围类型返回提示文案中的值：
 * - 用户标签：显示标签名称
 * - 用户：显示 UID
 */
const getDisplayText = (type: 1 | 2 | 3): string => {
    const rawValues = pickFieldValue(type)
    if (limitRange.value === 2) {
        return mapTagNames(rawValues).join(',')
    }

    return rawValues.join(',')
}

const handleCopy = (): void => {
    onCopyCode(getDisplayText(3))
}

const open = (payload: SaveSwapConfigResult, range: number, tags: TagOption[]): void => {
    warningPayload.value = {
        ...payload,
    }
    limitRange.value = range
    tagList.value = [...tags]
    visible.value = true
}

const close = (): void => {
    visible.value = false
}

defineExpose<WarningModalExpose>({
    open,
})
</script>

<template>
    <a-modal
        :visible="visible"
        :mask-closable="false"
        width="680px"
        :ok-text="t('确定')"
        :hide-cancel="true"
        @ok="close"
        @cancel="close"
    >
        <template #title>
            <div class="flex items-center gap-2">
                <IconExclamationCircleFill class="text-[var(--color-warning-6)]" />
                <span>{{ t('失败提醒') }}</span>
            </div>
        </template>

        <div class="flex flex-col gap-3 text-sm text-[var(--app-text-color)]">
            <div v-if="pickFieldValue(2).length" class="leading-6">
                <span>{{ t('当前{rangeLabel}为', { rangeLabel }) }}</span>
                <a-tooltip :content="getDisplayText(2)">
                    <span class="mx-1 inline-block max-w-[260px] truncate font-semibold text-[var(--color-danger-6)]">
                        {{ getDisplayText(2) }}
                    </span>
                </a-tooltip>
                <span>{{ t('的用户不存在，请填写正确的{rangeLabel}', { rangeLabel }) }}</span>
            </div>

            <div v-if="pickFieldValue(1).length" class="leading-6">
                <span>{{ t('当前{rangeLabel}为', { rangeLabel }) }}</span>
                <a-tooltip :content="getDisplayText(1)">
                    <span class="mx-1 inline-block max-w-[260px] truncate font-semibold text-[var(--color-danger-6)]">
                        {{ getDisplayText(1) }}
                    </span>
                </a-tooltip>
                <span>{{ t('的用户已有对应限制，不可重复添加') }}</span>
            </div>

            <div v-if="pickFieldValue(3).length" class="leading-6">
                <span>{{ t('当前{rangeLabel}为', { rangeLabel }) }}</span>
                <a-tooltip :content="getDisplayText(3)">
                    <span class="mx-1 inline-block max-w-[260px] truncate font-semibold text-[var(--color-success-6)]">
                        {{ getDisplayText(3) }}
                    </span>
                </a-tooltip>
                <span>{{ t('的用户可继续添加') }}</span>
                <a-button type="text" size="mini" class="!ml-1 !px-1" @click="handleCopy">
                    <template #icon>
                        <IconCopy />
                    </template>
                </a-button>
            </div>
        </div>
    </a-modal>
</template>
