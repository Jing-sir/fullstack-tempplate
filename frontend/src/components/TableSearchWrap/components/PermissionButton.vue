<script setup lang="ts">
import useSideBar from '@/store/sideBar';
import { useRoute } from 'vue-router';

type ButtonType = 'primary' | 'secondary' | 'outline' | 'dashed' | 'text';
type ButtonStatus = 'normal' | 'success' | 'warning' | 'danger';
type ButtonSize = 'mini' | 'small' | 'medium' | 'large';
interface PermissionButtonProps {
    buttonKey?: string;
    routeName?: string;
    type?: ButtonType;
    status?: ButtonStatus;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    hideWhenNoPermission?: boolean;
}

const props = withDefaults(defineProps<PermissionButtonProps>(), {
    buttonKey: '',
    routeName: '',
    type: 'text',
    status: 'normal',
    size: 'small',
    disabled: false,
    loading: false,
    hideWhenNoPermission: true,
});

const emit = defineEmits<{
    click: [event: MouseEvent];
}>();

const attrs = useAttrs();
const route = useRoute();
const sidebarStore = useSideBar();

/**
 * 是否需要做权限校验。
 * 如果没有传 buttonKey，这个组件就退化成一个通用按钮壳层，只负责统一按钮展示方式。
 */
const shouldCheckPermission = computed(() => Boolean(props.buttonKey));

/**
 * 统一转成字符串，兼容后端 number/string 混合字段。
 */
const toValue = (value: unknown): string => String(value ?? '');

/**
 * 当前路由名。
 * 如果组件显式传了 routeName，优先用显式值；否则回退当前 route.name。
 */
const currentRouteName = computed(() => toValue(props.routeName || route.name));

/**
 * 当前按钮是否具备权限。
 * 路由守卫已按列表页加载页面权限子树，这里统一从 Store 的递归索引判断。
 * 因此列表按钮、Tab 以及 Tab 内按钮无论嵌套多少层都能使用同一套权限 key。
 */
const hasPermission = computed(() => {
    if (!shouldCheckPermission.value) return true;
    const routeName = currentRouteName.value;
    const buttonKey = toValue(props.buttonKey);
    if (!routeName || !buttonKey) return false;

    return sidebarStore.hasPermission(`${routeName}-${buttonKey}`);
});

/**
 * 是否渲染按钮。
 * 默认无权限直接隐藏；如果后续有场景需要“展示但禁用”，可以把 hideWhenNoPermission 设为 false。
 */
const shouldRender = computed(() => hasPermission.value || !props.hideWhenNoPermission);

/**
 * 统一按钮样式基线。
 * 文本按钮默认去掉左右 padding，保持列表操作区更利落。
 */
const buttonClass = computed(() => (props.type === 'text' ? '!px-0' : ''));

const handleClick = (event: MouseEvent): void => {
    if (!hasPermission.value && props.hideWhenNoPermission) return;
    emit('click', event);
};
</script>

<template>
    <!-- 权限按钮：默认按 route.name + buttonKey 组合权限；没传 buttonKey 时退化成普通按钮 -->
    <a-button
        v-if="shouldRender"
        v-bind="attrs"
        :type="props.type"
        :status="props.status"
        :size="props.size"
        :disabled="props.disabled || (!hasPermission && !props.hideWhenNoPermission)"
        :loading="props.loading"
        :class="buttonClass"
        @click="handleClick"
    >
        <template v-if="$slots.icon" #icon>
            <slot name="icon" />
        </template>
        <slot />
    </a-button>
</template>
