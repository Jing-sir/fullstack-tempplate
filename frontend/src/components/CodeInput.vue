<script setup lang="ts">
const { t } = useI18n()

const props = withDefaults(
    defineProps<{
        modelValue?: string
        length?: number
        disabled?: boolean
    }>(),
    {
        modelValue: '',
        length: 6,
        disabled: false,
    },
)

const emit = defineEmits<{
    'update:modelValue': [value: string]
    complete: [value: string]
}>()

const isError = ref(false)
const isFocused = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
const inputValues = ref<string[]>(createEmptyValues(props.length))

const boxClass = computed(() => [
    'h-[50px] w-[46px] rounded border text-center text-xl font-bold leading-[48px] transition-colors select-none',
    props.disabled
        ? 'cursor-not-allowed border-[var(--app-divider)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)]'
        : 'bg-[var(--app-surface-strong)] text-[var(--app-text)]',
    isError.value ? 'border-red-500' : 'border-[var(--app-divider)]',
])

/**
 * 当前“输入光标”所在格子：
 * - 优先定位到第一个空位，方便继续输入
 * - 全部填满时定位到最后一格，方便用户继续删除
 */
const activeIndex = computed(() => {
    const firstEmptyIndex = inputValues.value.findIndex((value) => !value)
    return firstEmptyIndex === -1 ? props.length - 1 : firstEmptyIndex
})

const activeBoxClass = computed(() => {
    if (props.disabled) return ''
    return isError.value ? 'border-red-500' : 'border-[var(--color-primary-6)]'
})

function createEmptyValues(length: number): string[] {
    return Array.from({ length }, () => '')
}

function normalizeCode(value: string): string {
    return value.replace(/\D/g, '').slice(0, props.length)
}

const emitValue = (): string => {
    const value = inputValues.value.join('')
    emit('update:modelValue', value)

    if (value.length === props.length) {
        emit('complete', value)
    }

    return value
}

const syncInputValues = (value: string): void => {
    const normalizedValue = normalizeCode(String(value ?? ''))
    inputValues.value = createEmptyValues(props.length).map(
        (_, index) => normalizedValue[index] ?? '',
    )
}

/**
 * 统一写入整段验证码。
 * 键盘逐位输入、整段粘贴、父组件回填都走同一逻辑，避免状态分叉。
 */
const writeFullCode = (value: string): void => {
    const normalizedValue = normalizeCode(value)
    isError.value = value.trim() !== '' && normalizedValue === ''

    inputValues.value = createEmptyValues(props.length).map(
        (_, index) => normalizedValue[index] ?? '',
    )
    emitValue()
}

/**
 * 使用可聚焦容器替代原生 input：
 * - 视觉上仍然是 6 位分段输入
 * - 彻底绕开浏览器扩展对 OTP input 的自动补全注入，避免聚焦报错
 */
const handleKeyDown = (event: KeyboardEvent): void => {
    if (props.disabled) return

    const isPasteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v'
    if (isPasteShortcut) return

    if (event.key === 'Backspace') {
        event.preventDefault()
        isError.value = false
        writeFullCode(inputValues.value.join('').slice(0, -1))
        return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        return
    }

    if (/^\d$/.test(event.key)) {
        event.preventDefault()
        isError.value = false
        writeFullCode(`${inputValues.value.join('')}${event.key}`)
        return
    }

    if (event.key.length === 1) {
        event.preventDefault()
        isError.value = true
    }
}

const handlePaste = (event: ClipboardEvent): void => {
    if (props.disabled) return

    event.preventDefault()
    isError.value = false
    writeFullCode(event.clipboardData?.getData('text') ?? '')
}

const focus = (): void => {
    if (props.disabled) return
    nextTick(() => containerRef.value?.focus())
}

const onFocusContainer = (): void => {
    isFocused.value = true
}

const onBlurContainer = (): void => {
    isFocused.value = false
}

watch(
    () => props.modelValue,
    (value) => {
        syncInputValues(String(value ?? ''))
    },
    { immediate: true },
)

onMounted(() => {
    focus()
})

defineExpose({ focus })
</script>

<template>
    <div class="flex w-full flex-col py-3.5">
        <div
            ref="containerRef"
            class="flex items-center justify-between gap-2 rounded outline-none"
            :class="props.disabled ? 'cursor-not-allowed' : 'cursor-text'"
            :tabindex="props.disabled ? -1 : 0"
            role="group"
            @focus="onFocusContainer"
            @blur="onBlurContainer"
            @keydown="handleKeyDown"
            @paste="handlePaste"
            @click="focus"
        >
            <!-- 容器接管输入后，保留原有 6 位 OTP 视觉格子。 -->
            <div
                v-for="(_, index) in inputValues"
                :key="index"
                :class="[boxClass, isFocused && index === activeIndex ? activeBoxClass : '']"
            >
                {{ inputValues[index] }}
            </div>
        </div>
        <div class="h-5 pt-1.5 text-xs leading-5 text-red-500">
            <span v-if="isError">{{ t('非法输入') }}</span>
        </div>
    </div>
</template>
