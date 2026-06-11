<script setup lang="ts">
import type { TreeNodeKey } from '@arco-design/web-vue/es/tree/interface'
import { Message } from '@arco-design/web-vue'
import { IconSearch } from '@arco-design/web-vue/es/icon'
import sysRoleApi, {
    type PermissionMenuNode,
    type PermissionMenuType,
} from '@/api/sys/role'
import GoogleCode from '@/components/GoogleCode.vue'
import PermissionNodeFormDrawer from './PermissionNodeFormDrawer.vue'

type FormMode = 'create' | 'edit'
type SecurityActionType = 'delete' | 'status' | 'move'
type ArcoPermissionTreeNode = Omit<PermissionMenuNode, 'icon' | 'children'> & {
    children?: ArcoPermissionTreeNode[]
}

interface SecurityAction {
    type: SecurityActionType
    node: PermissionMenuNode
    status?: number
    sort?: number
}

const props = defineProps<{
    visible: boolean
}>()

const emit = defineEmits<{
    'update:visible': [value: boolean]
    success: []
}>()

const { t } = useI18n()

const isLoading = shallowRef(false)
const isSubmitting = shallowRef(false)
const treeData = ref<PermissionMenuNode[]>([])
const selectedKeys = ref<TreeNodeKey[]>([])
const searchKeyword = shallowRef('')
const typeFilter = shallowRef<PermissionMenuType | 0>(0)
const formVisible = shallowRef(false)
const formMode = shallowRef<FormMode>('create')
const formNode = shallowRef<PermissionMenuNode | null>(null)
const formParentNode = shallowRef<PermissionMenuNode | null>(null)
const googleCodeRef = ref<InstanceType<typeof GoogleCode> | null>(null)
const isGoogleCodeMounted = shallowRef(false)
const securityVisible = shallowRef(false)
const securityAction = shallowRef<SecurityAction | null>(null)
const securityCascade = shallowRef(false)

const visibleProxy = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
})

const typeOptions: Array<{ label: string; value: PermissionMenuType | 0 }> = [
    { label: '全部类型', value: 0 },
    { label: '目录/模块', value: 1 },
    { label: '列表页/菜单页', value: 2 },
    { label: '隐藏业务页', value: 3 },
    { label: '按钮/操作', value: 4 },
    { label: '页面内 Tab', value: 5 },
]

const typeTextMap: Record<PermissionMenuType, string> = {
    1: '目录/模块',
    2: '列表页/菜单页',
    3: '隐藏业务页',
    4: '按钮/操作',
    5: '页面内 Tab',
}

const flattenNodes = (nodes: PermissionMenuNode[]): PermissionMenuNode[] =>
    nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])])

const findNode = (nodes: PermissionMenuNode[], id: number): PermissionMenuNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node
        const child = findNode(node.children ?? [], id)
        if (child) return child
    }
    return null
}

const findPath = (
    nodes: PermissionMenuNode[],
    id: number,
    path: PermissionMenuNode[] = [],
): PermissionMenuNode[] => {
    for (const node of nodes) {
        const nextPath = [...path, node]
        if (node.id === id) return nextPath
        const childPath = findPath(node.children ?? [], id, nextPath)
        if (childPath.length) return childPath
    }
    return []
}

const filterNodes = (nodes: PermissionMenuNode[]): PermissionMenuNode[] => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    const selectedType = typeFilter.value

    const walk = (node: PermissionMenuNode): PermissionMenuNode | null => {
        const children = (node.children ?? [])
            .map((child) => walk(child))
            .filter((child): child is PermissionMenuNode => child !== null)
        const matchesKeyword =
            !keyword ||
            node.title.toLowerCase().includes(keyword) ||
            node.name.toLowerCase().includes(keyword)
        const matchesType = !selectedType || node.type === selectedType

        if ((matchesKeyword && matchesType) || children.length) {
            return {
                ...node,
                children,
            }
        }
        return null
    }

    return nodes.map((node) => walk(node)).filter((node): node is PermissionMenuNode => node !== null)
}

const toArcoTreeData = (nodes: PermissionMenuNode[]): ArcoPermissionTreeNode[] =>
    nodes.map(({ icon: _icon, children, ...node }) => ({
        ...node,
        children: children?.length ? toArcoTreeData(children) : undefined,
    }))

const visibleTree = computed(() => filterNodes(treeData.value))
const arcoVisibleTree = computed(() => toArcoTreeData(visibleTree.value))
const selectedNode = computed(() => {
    const id = Number(selectedKeys.value[0] ?? 0)
    return id ? findNode(treeData.value, id) : null
})
const selectedPathText = computed(() =>
    selectedNode.value
        ? findPath(treeData.value, selectedNode.value.id)
              .map((node) => node.title)
              .join(' / ')
        : '--',
)
const selectedTypeText = computed(() =>
    selectedNode.value ? t(typeTextMap[selectedNode.value.type]) : '--',
)
const allNodeCount = computed(() => flattenNodes(treeData.value).length)

const loadTree = async (): Promise<void> => {
    isLoading.value = true
    try {
        const nextTree = await sysRoleApi.permissionMenuTree()
        treeData.value = nextTree
        const currentID = Number(selectedKeys.value[0] ?? 0)
        if (!currentID || !findNode(nextTree, currentID)) {
            selectedKeys.value = nextTree[0] ? [nextTree[0].id] : []
        }
    } finally {
        isLoading.value = false
    }
}

const closeDrawer = (): void => {
    googleCodeRef.value?.closeDialog()
    isGoogleCodeMounted.value = false
    securityVisible.value = false
    securityAction.value = null
    visibleProxy.value = false
}

const handleSelect = (keys: TreeNodeKey[]): void => {
    selectedKeys.value = keys
}

const openCreateRoot = (): void => {
    formMode.value = 'create'
    formNode.value = null
    formParentNode.value = null
    formVisible.value = true
}

const openCreateChild = (node: PermissionMenuNode): void => {
    formMode.value = 'create'
    formNode.value = null
    formParentNode.value = node
    formVisible.value = true
}

const openEdit = (node: PermissionMenuNode): void => {
    formMode.value = 'edit'
    formNode.value = node
    formParentNode.value = null
    formVisible.value = true
}

const handleFormSuccess = async (): Promise<void> => {
    await loadTree()
    emit('success')
}

const openSecurityAction = (action: SecurityAction): void => {
    securityAction.value = action
    securityCascade.value = false
    securityVisible.value = true
}

const securityTitle = computed(() => {
    const action = securityAction.value
    if (!action) return t('2FA验证')
    if (action.type === 'delete') return t('删除权限节点')
    if (action.type === 'status') return action.status === 1 ? t('启用权限节点') : t('禁用权限节点')
    return t('调整权限排序')
})

const securityDescription = computed(() => {
    const node = securityAction.value?.node
    if (!node) return ''
    return `${node.title} (${node.name})`
})
const twoFAAction = computed(() => {
    if (securityAction.value?.type === 'delete') return 'permission.menu.delete'
    if (securityAction.value?.type === 'status') return 'permission.menu.status'
    return 'permission.menu.move'
})
const twoFATarget = computed(() =>
    securityAction.value ? `menu:${securityAction.value.node.id}` : '',
)

const hasChildren = computed(() => Boolean(securityAction.value?.node.children?.length))

const handleSecurityConfirm = async (): Promise<void> => {
    if (!securityAction.value) return
    securityVisible.value = false
    isGoogleCodeMounted.value = true
    await nextTick()
    await googleCodeRef.value?.onShowDialog(true)
}

const handleTwoFAConfirm = async (facode: string, faChallengeID: string): Promise<void> => {
    const action = securityAction.value
    if (!action) return

    isSubmitting.value = true
    try {
        if (action.type === 'delete') {
            await sysRoleApi.deletePermissionMenu(action.node.id, {
                facode,
                fa_challenge_id: faChallengeID,
                cascade: securityCascade.value,
            })
        } else if (action.type === 'status') {
            await sysRoleApi.updatePermissionMenuStatus(action.node.id, {
                facode,
                fa_challenge_id: faChallengeID,
                status: Number(action.status),
            })
        } else {
            await sysRoleApi.movePermissionMenu(action.node.id, {
                facode,
                fa_challenge_id: faChallengeID,
                parent_id: action.node.parentId,
                sort: Number(action.sort ?? action.node.sort),
            })
        }

        Message.success(t('操作成功'))
        googleCodeRef.value?.closeDialog()
        isGoogleCodeMounted.value = false
        securityVisible.value = false
        await loadTree()
        emit('success')
        securityAction.value = null
    } finally {
        isSubmitting.value = false
    }
}

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            void loadTree()
        }
    },
)
</script>

<template>
    <a-drawer
        v-model:visible="visibleProxy"
        :title="t('管理权限节点')"
        :width="960"
        :mask-closable="false"
        @cancel="closeDrawer"
    >
        <a-spin :loading="isLoading" class="block h-full">
            <div class="grid h-full min-h-[620px] grid-cols-[360px_minmax(0,1fr)] gap-4">
                <section class="flex min-h-0 flex-col rounded-lg border border-[var(--app-divider)] bg-[var(--app-surface)]">
                    <div class="border-b border-[var(--app-divider)] p-3">
                        <div class="mb-3 flex items-center justify-between gap-2">
                            <div>
                                <p class="text-sm font-semibold text-[var(--app-text)]">
                                    {{ t('权限树') }}
                                </p>
                                <p class="text-xs text-[var(--app-text-muted)]">
                                    {{ t('共 {count} 项', { count: allNodeCount }) }}
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <a-button size="mini" @click="loadTree">{{ t('刷新') }}</a-button>
                                <a-button type="primary" size="mini" @click="openCreateRoot">
                                    {{ t('新增根节点') }}
                                </a-button>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <a-input
                                v-model="searchKeyword"
                                allow-clear
                                size="small"
                                :placeholder="t('搜索权限名称或 key')"
                            >
                                <template #prefix>
                                    <IconSearch />
                                </template>
                            </a-input>
                            <a-select v-model="typeFilter" size="small">
                                <a-option
                                    v-for="option in typeOptions"
                                    :key="option.value"
                                    :value="option.value"
                                >
                                    {{ t(option.label) }}
                                </a-option>
                            </a-select>
                        </div>
                    </div>

                    <div class="min-h-0 flex-1 overflow-y-auto p-3">
                        <a-tree
                            v-if="arcoVisibleTree.length"
                            :selected-keys="selectedKeys"
                            :data="arcoVisibleTree"
                            :field-names="{ children: 'children', title: 'title', key: 'id' }"
                            size="small"
                            block-node
                            @select="handleSelect"
                        />
                        <a-empty v-else :description="t('暂无数据')" />
                    </div>
                </section>

                <section class="flex min-h-0 flex-col rounded-lg border border-[var(--app-divider)] bg-[var(--app-surface-strong)]">
                    <div class="border-b border-[var(--app-divider)] p-4">
                        <p class="text-sm font-semibold text-[var(--app-text)]">
                            {{ t('节点详情') }}
                        </p>
                        <p class="mt-1 text-xs text-[var(--app-text-muted)]">
                            {{ selectedPathText }}
                        </p>
                    </div>

                    <div v-if="selectedNode" class="min-h-0 flex-1 overflow-y-auto p-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-lg bg-[var(--app-surface)] p-3">
                                <p class="text-xs text-[var(--app-text-muted)]">{{ t('权限名称') }}</p>
                                <p class="mt-1 text-sm font-medium text-[var(--app-text)]">
                                    {{ selectedNode.title }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-[var(--app-surface)] p-3">
                                <p class="text-xs text-[var(--app-text-muted)]">{{ t('权限 key') }}</p>
                                <p class="mt-1 break-all text-sm font-medium text-[var(--app-text)]">
                                    {{ selectedNode.name }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-[var(--app-surface)] p-3">
                                <p class="text-xs text-[var(--app-text-muted)]">{{ t('权限类型') }}</p>
                                <p class="mt-1 text-sm font-medium text-[var(--app-text)]">
                                    {{ selectedTypeText }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-[var(--app-surface)] p-3">
                                <p class="text-xs text-[var(--app-text-muted)]">{{ t('状态') }}</p>
                                <p class="mt-1">
                                    <a-tag :color="selectedNode.status === 1 ? 'green' : 'gray'" size="small">
                                        {{ selectedNode.status === 1 ? t('启用') : t('禁用') }}
                                    </a-tag>
                                </p>
                            </div>
                            <div class="rounded-lg bg-[var(--app-surface)] p-3">
                                <p class="text-xs text-[var(--app-text-muted)]">{{ t('排序') }}</p>
                                <p class="mt-1 text-sm font-medium text-[var(--app-text)]">
                                    {{ selectedNode.sort }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-[var(--app-surface)] p-3">
                                <p class="text-xs text-[var(--app-text-muted)]">{{ t('子节点') }}</p>
                                <p class="mt-1 text-sm font-medium text-[var(--app-text)]">
                                    {{ selectedNode.children?.length ?? 0 }}
                                </p>
                            </div>
                        </div>

                        <div class="mt-5 flex flex-wrap gap-2">
                            <a-button type="primary" size="small" @click="openCreateChild(selectedNode)">
                                {{ t('新增子权限') }}
                            </a-button>
                            <a-button size="small" @click="openEdit(selectedNode)">
                                {{ t('编辑') }}
                            </a-button>
                            <a-button
                                size="small"
                                :disabled="selectedNode.protected"
                                @click="
                                    openSecurityAction({
                                        type: 'status',
                                        node: selectedNode,
                                        status: selectedNode.status === 1 ? 0 : 1,
                                    })
                                "
                            >
                                {{ selectedNode.status === 1 ? t('禁用') : t('启用') }}
                            </a-button>
                            <a-button
                                size="small"
                                :disabled="selectedNode.protected"
                                @click="
                                    openSecurityAction({
                                        type: 'move',
                                        node: selectedNode,
                                        sort: Math.max(0, selectedNode.sort - 1),
                                    })
                                "
                            >
                                {{ t('上移') }}
                            </a-button>
                            <a-button
                                size="small"
                                :disabled="selectedNode.protected"
                                @click="
                                    openSecurityAction({
                                        type: 'move',
                                        node: selectedNode,
                                        sort: selectedNode.sort + 1,
                                    })
                                "
                            >
                                {{ t('下移') }}
                            </a-button>
                            <a-button
                                status="danger"
                                size="small"
                                :disabled="selectedNode.protected"
                                @click="openSecurityAction({ type: 'delete', node: selectedNode })"
                            >
                                {{ t('删除') }}
                            </a-button>
                        </div>
                    </div>
                    <div v-else class="flex min-h-0 flex-1 items-center justify-center">
                        <a-empty :description="t('请选择权限节点')" />
                    </div>
                </section>
            </div>
        </a-spin>

        <template #footer>
            <div class="flex justify-end">
                <a-button size="small" @click="closeDrawer">{{ t('关闭') }}</a-button>
            </div>
        </template>

        <PermissionNodeFormDrawer
            v-model:visible="formVisible"
            :mode="formMode"
            :node="formNode"
            :parent-node="formParentNode"
            :nodes="treeData"
            @success="handleFormSuccess"
        />

        <a-modal
            v-model:visible="securityVisible"
            :title="securityTitle"
            :footer="false"
            :mask-closable="false"
        >
            <div class="space-y-4">
                <div>
                    <p class="text-sm font-medium text-[var(--app-text)]">{{ securityDescription }}</p>
                    <p class="mt-1 text-xs text-[var(--app-text-muted)]">
                        {{ t('确认后将进入独立的 2FA 验证弹窗') }}
                    </p>
                </div>

                <a-checkbox
                    v-if="securityAction?.type === 'delete' && hasChildren"
                    v-model="securityCascade"
                >
                    {{ t('同时删除所有子权限') }}
                </a-checkbox>

                <div class="flex justify-end gap-2">
                    <a-button size="small" :disabled="isSubmitting" @click="securityVisible = false">
                        {{ t('取消') }}
                    </a-button>
                    <a-button
                        type="primary"
                        size="small"
                        :status="securityAction?.type === 'delete' ? 'danger' : 'normal'"
                        :loading="isSubmitting"
                        @click="handleSecurityConfirm"
                    >
                        {{ t('继续验证') }}
                    </a-button>
                </div>
            </div>
        </a-modal>

        <GoogleCode
            v-if="isGoogleCodeMounted"
            ref="googleCodeRef"
            :loading="isSubmitting"
            :action="twoFAAction"
            :target="twoFATarget"
            @set-code="handleTwoFAConfirm"
            @cancel="isGoogleCodeMounted = false"
        />
    </a-drawer>
</template>
