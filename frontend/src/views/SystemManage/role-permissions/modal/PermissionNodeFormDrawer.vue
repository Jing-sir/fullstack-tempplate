<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import sysRoleApi, {
    type PermissionMenuNode,
    type PermissionMenuType,
} from '@/api/sys/role'
import GoogleCode from '@/components/GoogleCode.vue'

type FormMode = 'create' | 'edit'

const props = withDefaults(
    defineProps<{
        visible: boolean
        mode: FormMode
        node?: PermissionMenuNode | null
        parentNode?: PermissionMenuNode | null
        nodes: PermissionMenuNode[]
    }>(),
    {
        node: null,
        parentNode: null,
    },
)

const emit = defineEmits<{
    'update:visible': [value: boolean]
    success: []
}>()

const { t } = useI18n()

const formRef = ref<FormInstance>()
const googleCodeRef = ref<InstanceType<typeof GoogleCode> | null>(null)
const isGoogleCodeMounted = shallowRef(false)
const isSubmitting = shallowRef(false)
const formState = reactive({
    parent_id: 0,
    name: '',
    title: '',
    type: 1 as PermissionMenuType,
    icon: '',
    sort: 10,
    status: 1,
})

const typeOptions: Array<{ label: string; value: PermissionMenuType }> = [
    { label: '目录/模块', value: 1 },
    { label: '列表页/菜单页', value: 2 },
    { label: '隐藏业务页', value: 3 },
    { label: '按钮/操作', value: 4 },
    { label: '页面内 Tab', value: 5 },
]

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
})

const isEdit = computed(() => props.mode === 'edit')
const isProtected = computed(() => Boolean(isEdit.value && props.node?.protected))
const drawerTitle = computed(() => (isEdit.value ? t('编辑权限节点') : t('新增权限节点')))
const twoFAAction = computed(() =>
    isEdit.value ? 'permission.menu.update' : 'permission.menu.create',
)
const twoFATarget = computed(() =>
    isEdit.value && props.node
        ? `menu:${props.node.id}`
        : `parent:${formState.parent_id}:key:${formState.name.trim()}`,
)

const formRules: Record<string, FieldRule[]> = {
    title: [{ required: true, message: t('请输入'), trigger: 'blur' }],
    name: [
        { required: true, message: t('请输入'), trigger: 'blur' },
        {
            match: /^[A-Za-z][A-Za-z0-9-]*$/,
            message: t('权限 key 必须以字母开头，仅支持字母、数字和中划线'),
            trigger: 'blur',
        },
    ],
    type: [{ required: true, message: t('请选择'), trigger: 'change' }],
}

const defaultChildType = (parent?: PermissionMenuNode | null): PermissionMenuType => {
    if (!parent) return 1
    if (parent.type === 1) return 2
    if (parent.type === 2 || parent.type === 5) return 4
    return 4
}

const flattenNodes = (nodes: PermissionMenuNode[], level = 0): Array<PermissionMenuNode & { level: number }> =>
    nodes.flatMap((node) => [
        { ...node, level },
        ...flattenNodes(node.children ?? [], level + 1),
    ])

const isDescendant = (nodes: PermissionMenuNode[], ancestorID: number, targetID: number): boolean => {
    const find = (items: PermissionMenuNode[]): PermissionMenuNode | null => {
        for (const item of items) {
            if (item.id === ancestorID) return item
            const child = find(item.children ?? [])
            if (child) return child
        }
        return null
    }

    const walk = (node: PermissionMenuNode): boolean =>
        node.id === targetID || (node.children ?? []).some(walk)

    const ancestor = find(nodes)
    return ancestor ? (ancestor.children ?? []).some(walk) : false
}

const canUseParent = (parent: PermissionMenuNode | null, type: PermissionMenuType): boolean => {
    if (!parent) return type === 1
    if (isEdit.value && props.node && parent.id === props.node.id) return false
    if (isEdit.value && props.node && isDescendant(props.nodes, props.node.id, parent.id)) return false

    if (type === 1) return parent.type === 1
    if (type === 2) return parent.type === 1
    if (type === 3) return parent.type === 2
    if (type === 4 || type === 5) return parent.type === 2 || parent.type === 5
    return false
}

const parentOptions = computed(() => [
    {
        label: t('根节点'),
        value: 0,
        disabled: !canUseParent(null, formState.type),
    },
    ...flattenNodes(props.nodes).map((node) => ({
        label: `${'  '.repeat(node.level)}${node.title} (${node.name})`,
        value: node.id,
        disabled: !canUseParent(node, formState.type),
    })),
])

const resetForm = (): void => {
    const node = props.node
    const parentNode = props.parentNode

    if (isEdit.value && node) {
        formState.parent_id = node.parentId
        formState.name = node.name
        formState.title = node.title
        formState.type = node.type
        formState.icon = node.icon
        formState.sort = node.sort
        formState.status = node.status
    } else {
        formState.parent_id = parentNode?.id ?? 0
        formState.name = ''
        formState.title = ''
        formState.type = defaultChildType(parentNode)
        formState.icon = ''
        formState.sort = ((parentNode?.children?.length ?? props.nodes.length) + 1) * 10
        formState.status = 1
    }
    formRef.value?.clearValidate()
}

const closeDrawer = (): void => {
    googleCodeRef.value?.closeDialog()
    isGoogleCodeMounted.value = false
    visibleProxy.value = false
}

const openTwoFAVerification = async (): Promise<void> => {
    isGoogleCodeMounted.value = true
    await nextTick()
    await googleCodeRef.value?.onShowDialog(true)
}

const submitMutation = async (facode: string, faChallengeID: string): Promise<void> => {
    isSubmitting.value = true
    try {
        const params = {
            parent_id: formState.parent_id,
            name: isEdit.value && props.node ? props.node.name : formState.name.trim(),
            title: formState.title.trim(),
            type: formState.type,
            icon: formState.icon.trim(),
            sort: Number(formState.sort) || 0,
            status: Number(formState.status),
            facode,
            fa_challenge_id: faChallengeID,
        }

        if (isEdit.value && props.node) {
            await sysRoleApi.updatePermissionMenu(props.node.id, params)
        } else {
            await sysRoleApi.createPermissionMenu(params)
        }

        Message.success(t('操作成功'))
        googleCodeRef.value?.closeDialog()
        isGoogleCodeMounted.value = false
        emit('success')
        closeDrawer()
    } finally {
        isSubmitting.value = false
    }
}

const handleSubmit = async (): Promise<void> => {
    const errors = await formRef.value?.validate()
    if (errors) return

    await openTwoFAVerification()
}

watch(
    () => props.visible,
    (visible) => {
        if (visible) resetForm()
    },
)
</script>

<template>
    <a-drawer
        v-model:visible="visibleProxy"
        :title="drawerTitle"
        :width="520"
        :mask-closable="false"
        @cancel="closeDrawer"
    >
        <a-form
            ref="formRef"
            :model="formState"
            :rules="formRules"
            layout="vertical"
            class="permission-node-form"
        >
            <a-form-item :label="t('父级权限')" field="parent_id">
                <a-select
                    v-model="formState.parent_id"
                    size="small"
                    :placeholder="t('请选择')"
                    :disabled="isProtected"
                >
                    <a-option
                        v-for="option in parentOptions"
                        :key="option.value"
                        :value="option.value"
                        :disabled="option.disabled"
                    >
                        {{ option.label }}
                    </a-option>
                </a-select>
            </a-form-item>

            <a-form-item :label="t('权限类型')" field="type">
                <a-select
                    v-model="formState.type"
                    size="small"
                    :placeholder="t('请选择')"
                    :disabled="isProtected"
                >
                    <a-option v-for="option in typeOptions" :key="option.value" :value="option.value">
                        {{ t(option.label) }}
                    </a-option>
                </a-select>
            </a-form-item>

            <a-form-item :label="t('权限名称')" field="title">
                <a-input v-model="formState.title" size="small" :placeholder="t('请输入')" />
            </a-form-item>

            <a-form-item :label="t('权限 key')" field="name">
                <a-input
                    v-model="formState.name"
                    size="small"
                    :placeholder="t('请输入')"
                    :disabled="isEdit"
                />
            </a-form-item>

            <a-form-item :label="t('图标')" field="icon">
                <a-input v-model="formState.icon" size="small" :placeholder="t('请输入')" />
            </a-form-item>

            <div class="grid grid-cols-2 gap-3">
                <a-form-item :label="t('排序')" field="sort">
                    <a-input-number v-model="formState.sort" size="small" class="w-full" />
                </a-form-item>

                <a-form-item :label="t('状态')" field="status">
                    <a-radio-group
                        v-model="formState.status"
                        type="button"
                        size="small"
                        :disabled="isProtected"
                    >
                        <a-radio :value="1">{{ t('启用') }}</a-radio>
                        <a-radio :value="0">{{ t('禁用') }}</a-radio>
                    </a-radio-group>
                </a-form-item>
            </div>

        </a-form>

        <template #footer>
            <div class="flex justify-end gap-2">
                <a-button size="small" :disabled="isSubmitting" @click="closeDrawer">
                    {{ t('取消') }}
                </a-button>
                <a-button type="primary" size="small" :loading="isSubmitting" @click="handleSubmit">
                    {{ t('确认') }}
                </a-button>
            </div>
        </template>

        <GoogleCode
            v-if="isGoogleCodeMounted"
            ref="googleCodeRef"
            :loading="isSubmitting"
            :action="twoFAAction"
            :target="twoFATarget"
            @set-code="submitMutation"
            @cancel="isGoogleCodeMounted = false"
        />
    </a-drawer>
</template>
