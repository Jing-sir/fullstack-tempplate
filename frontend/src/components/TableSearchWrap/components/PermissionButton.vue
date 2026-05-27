<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useSideBar from '@/store/sideBar';
import { useRoute } from 'vue-router';

type ButtonType = 'primary' | 'secondary' | 'outline' | 'dashed' | 'text';
type ButtonStatus = 'normal' | 'success' | 'warning' | 'danger';
type ButtonSize = 'mini' | 'small' | 'medium' | 'large';
type RoleMenuItem = {
    id?: string | number;
    menuId?: string | number;
    parentId?: string | number | null;
    name?: string;
    component?: string;
    route?: string;
};

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
const { roleMenu } = storeToRefs(useSideBar());

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
 * 兼容老项目菜单结构：
 * 1. 先用 routeName 找当前菜单节点（component/route/name 任一匹配）
 * 2. 再按 menuId 或 id 找子按钮（parentId 对应）
 */
const getButtonsForMenu = (routeName: string): RoleMenuItem[] => {
    const menuList = roleMenu.value as unknown as RoleMenuItem[];
    const currentMenu = menuList.find((item) =>
        [item.component, item.route, item.name].some((field) => toValue(field) === routeName),
    );
    if (!currentMenu) return [];

    const menuId = toValue(currentMenu.menuId ?? currentMenu.id);
    if (!menuId) return [];

    return menuList.filter((item) => toValue(item.parentId) === menuId);
};

/**
 * 当前按钮是否具备权限。
 * 优先匹配新项目规则 `${routeName}-${buttonKey}`，再回退老项目 `component === buttonKey`。
 */
const hasPermission = computed(() => {
    if (!shouldCheckPermission.value) return true;
    const routeName = currentRouteName.value;
    const buttonKey = toValue(props.buttonKey);
    if (!routeName || !buttonKey) return false;

    const menuList = roleMenu.value as unknown as RoleMenuItem[];
    const newPermissionName = `${routeName}-${buttonKey}`;

    const hasNewPermission = menuList.some((item) =>
        [item.name, item.component].some((field) => toValue(field) === newPermissionName),
    );
    if (hasNewPermission) return true;

    const buttonList = getButtonsForMenu(routeName);
    return buttonList.some((item) => toValue(item.component) === buttonKey);
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
