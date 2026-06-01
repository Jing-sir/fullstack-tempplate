<script setup lang="ts">
import type { FieldRule, FormInstance } from '@arco-design/web-vue';
import { Message } from '@arco-design/web-vue';
import { IconSearch } from '@arco-design/web-vue/es/icon';
import NProgress from 'nprogress';
import type { TreeNodeKey } from '@arco-design/web-vue/es/tree/interface';
import type { TreeDataType } from '@/interface/SystemManageType';
import { buildTree } from '@/utils/common';
import sysRoleApi from '@/api/sys/role';

interface PermissionSummaryItem {
    key: string;
    title: string;
    moduleKey: string;
    moduleTitle: string;
    path: string[];
    type?: number;
}

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const sidebarStore = sideBar();
const tagsViewStore = tagsView();

// 表单级状态和页面级交互状态统一放在顶部，便于快速识别“字段状态”和“视图状态”。
const formRef = ref<FormInstance>();
const isSpinning = ref(false);
const isLoading = ref(false);
const allRoleList = ref<TreeDataType[]>([]);
const currentModuleKey = ref('');
const searchKeyword = ref('');
const onlySelected = ref(false);
const manualExpandedKeys = ref<string[]>([]);

const roleId = computed(() => String(route.params.id || ''));
const see = computed(() => Boolean(route.params.see));

// 当前页面唯一需要提交给接口的核心数据。
// 其中 checkedKeys 始终保持扁平 key 数组，避免树组件和接口模型来回转换。
const currState = reactive({
    roleName: '',
    roleId: '',
    remark: '',
    checkedKeys: [] as string[],
});

const rules: Record<string, FieldRule[]> = {
    roleName: [{ required: true, message: t('请输入角色名称'), trigger: 'blur' }],
};

// 频繁判断“当前权限是否已选”时用 Set，避免在大权限树里反复线性查找。
const checkedKeySet = computed(() => new Set(currState.checkedKeys.map((key) => String(key))));

// 后端返回的是平铺菜单列表，这里先统一转成真正的树结构，
// 后续模块导航、树展示、已选清单都从这棵树派生，保证数据源唯一。
const rootRoleList = computed(() =>
    buildTree<TreeDataType>(allRoleList.value, 'children', 'menuId', 'parentId') || [],
);

// 左侧模块导航只关心一级模块，因此从根树提取最轻量的导航数据。
const moduleList = computed(() =>
    rootRoleList.value.map((item) => ({
        key: String(item.menuId),
        title: item.menuName,
    })),
);

const currentModule = computed(() =>
    rootRoleList.value.find((item) => String(item.menuId) === currentModuleKey.value) ?? null,
);

// 递归收集节点下所有 type=3 后代的 menuId key。
// 用于 type=2 勾选/取消勾选时自动联动其隐藏路由页子节点。
const collectHiddenDescendants = (nodes: TreeDataType[]): string[] =>
    nodes.flatMap((node) => {
        const descendants = collectHiddenDescendants(node.children ?? []);
        return node.type === 3 ? [String(node.menuId), ...descendants] : descendants;
    });

// 将整棵权限树拍平成”可搜索、可分组、可回跳”的索引。
// 右侧已选权限清单不会再直接遍历树，而是基于这个索引做筛选和聚合。
const flattenPermissionTree = (
    nodes: TreeDataType[],
    moduleKey: string,
    moduleTitle: string,
    parentPath: string[] = [],
): PermissionSummaryItem[] =>
    nodes.flatMap((node) => {
        const key = String(node.menuId);
        const path = [...parentPath, node.menuName];
        const current: PermissionSummaryItem = {
            key,
            title: node.menuName,
            moduleKey,
            moduleTitle,
            path,
            type: node.type,
        };

        return [
            current,
            ...flattenPermissionTree(node.children ?? [], moduleKey, moduleTitle, path),
        ];
    });

const permissionSummary = computed(() =>
    rootRoleList.value.flatMap((module) =>
        flattenPermissionTree([module], String(module.menuId), module.menuName),
    ),
);

// 右侧清单和顶部统计都建立在”已选索引”上，避免直接操作树节点。
// type=3 隐藏路由页不在清单中展示（对管理员无业务语义，由 type=2 联动控制）。
const selectedPermissionList = computed(() =>
    permissionSummary.value.filter(
        (item) => checkedKeySet.value.has(item.key) && item.type !== 3,
    ),
);

// 左侧模块角标直接复用已选索引聚合结果。
const selectedCountByModule = computed(() =>
    selectedPermissionList.value.reduce<Record<string, number>>((acc, item) => {
        acc[item.moduleKey] = (acc[item.moduleKey] ?? 0) + 1;
        return acc;
    }, {}),
);

// 右侧“已选权限清单”按模块分组，和左侧模块导航保持同一认知模型。
const groupedSelectedPermissions = computed(() =>
    moduleList.value
        .map((module) => ({
            ...module,
            permissions: selectedPermissionList.value.filter(
                (item) => item.moduleKey === module.key,
            ),
        }))
        .filter((group) => group.permissions.length > 0),
);

const getExpandableKeys = (nodes: TreeDataType[]): string[] =>
    nodes.flatMap((node) => {
        const key = String(node.menuId);
        const children = node.children ?? [];

        return children.length ? [key, ...getExpandableKeys(children)] : [];
    });

const filterTreeNodes = (nodes: TreeDataType[]): TreeDataType[] => {
    const keyword = searchKeyword.value.trim().toLowerCase();

    const walk = (node: TreeDataType): TreeDataType | null => {
        // 搜索和“仅看已选”共用一套递归过滤，确保：
        // 1. 命中的父节点能保留完整层级关系
        // 2. 命中的子节点能把父链一起带出来
        // 3. 树组件拿到的仍然是合法树结构，而不是扁平结果
        const children = (node.children ?? [])
            .map((child) => walk(child))
            .filter((child): child is TreeDataType => child !== null);
        const key = String(node.menuId);
        const matchKeyword = !keyword || node.menuName.toLowerCase().includes(keyword);
        const matchSelected =
            !onlySelected.value || checkedKeySet.value.has(key) || children.length > 0;

        if (!matchSelected) return null;
        if (!matchKeyword && !children.length) return null;

        return {
            ...node,
            children,
        };
    };

    return nodes
        .map((node) => walk(node))
        .filter((node): node is TreeDataType => node !== null);
};

// 中间树面板一次只展示当前模块，避免把所有权限树一次性塞给用户。
const currentModuleTree = computed(() => (currentModule.value ? [currentModule.value] : []));

const visibleTreeData = computed(() => filterTreeNodes(currentModuleTree.value));

const readonlyTreeData = computed<TreeDataType[]>(() => {
    const markReadonly = (nodes: TreeDataType[]): TreeDataType[] =>
        nodes.map((node) => ({
            ...node,
            // type=3 隐藏路由页始终禁用 checkbox（跟随父级 type=2 联动，不可单独操作）；
            // 查看模式下所有节点也锁定交互。
            disableCheckbox: node.type === 3 || see.value,
            children: markReadonly(node.children ?? []),
        }));

    return markReadonly(visibleTreeData.value);
});

// 搜索或“仅看已选”开启时，优先自动展开命中路径；
// 平时则尊重用户手动展开/收起的状态。
const displayedExpandedKeys = computed(() => {
    if (searchKeyword.value.trim() || onlySelected.value) {
        return getExpandableKeys(visibleTreeData.value);
    }

    return manualExpandedKeys.value;
});

const selectedPermissionCount = computed(() => selectedPermissionList.value.length);

const handleBack = (): void => {
    router.back();
    if (route.name) {
        tagsViewStore.deleteVisitedViewByName(String(route.name), true);
    }
};

// 树组件返回的是 number|string 混合 key，这里统一转成 string，和本页其它状态保持一致。
const handleExpand = (expandedKeys: TreeNodeKey[]): void => {
    manualExpandedKeys.value = expandedKeys.map((key) => String(key));
};

// 展开/收起只针对当前模块生效，避免用户误以为会影响整棵权限树。
const expandAll = (): void => {
    manualExpandedKeys.value = getExpandableKeys(currentModuleTree.value);
};

const collapseAll = (): void => {
    manualExpandedKeys.value = currentModule.value ? [String(currentModule.value.menuId)] : [];
};

const focusModule = (moduleKey: string): void => {
    currentModuleKey.value = moduleKey;
};

// 从右侧已选清单移除权限时，除了更新 checkedKeys，也同步把当前模块切回该权限所在模块，
// 这样用户删除后马上就能在中间树里看到最新状态。
const removePermission = (permissionKey: string, moduleKey: string): void => {
    currState.checkedKeys = currState.checkedKeys.filter((key) => String(key) !== permissionKey);
    currentModuleKey.value = moduleKey;
};

// 第一步只拉完整权限树；角色详情和已勾选权限在编辑/查看时再单独补齐。
const fetchRoleList = async (): Promise<void> => {
    NProgress.start();
    isSpinning.value = true;

    try {
        allRoleList.value = await sysRoleApi.sysRoleMenuList();
    } finally {
        NProgress.done();
        isSpinning.value = false;
    }
};

// 编辑/查看场景需要把“角色基本信息”和“已勾选权限”分别回填到表单状态。
const fetchRoleListDetail = (): void => {
    sysRoleApi.sysInfoCheckMenuList({ roleId: currState.roleId }).then((data) => {
        currState.checkedKeys = data.map((item) => String(item.menuId));
    });

    sysRoleApi.sysRoleInfo({ roleId: currState.roleId }).then((data) => {
        currState.roleId = data.roleId;
        currState.roleName = data.roleName;
        currState.remark = data.remark ?? '';
    });
};

const handleSaveData = async (): Promise<void> => {
    // 保存前先做基础字段校验，再校验权限树至少选择了一项。
    const errors = await formRef.value?.validate();
    if (errors) return;
    if (!currState.checkedKeys.length) {
        Message.warning(t('请勾选权限'));
        return;
    }

    isLoading.value = true;
    isSpinning.value = true;

    // 接口仍然要求扁平 menuIdList，这里把前端树选中状态统一转换成后端需要的结构。
    const menuIdList = currState.checkedKeys.map((value) => ({
        checkUserPassword: 2,
        menuId: Number(value),
    }));

    sysRoleApi.sysRoleAddUpdate({
        checkOpPassword: false,
        menuIdList,
        remark: currState.remark,
        state: 1,
        roleName: currState.roleName,
        roleId: currState.roleId || undefined,
    })
        .then(() => {
            Message.success(t('操作成功'));
            handleBack();
            sidebarStore.fetchSidebarRoutes();
        })
        .finally(() => {
            isLoading.value = false;
            isSpinning.value = false;
        });
};

// type=2 菜单页勾选/取消勾选时，自动联动其下所有 type=3 隐藏路由页子节点。
// 使用独立的 isLinkingHidden flag 避免联动赋值触发 watch 循环。
const isLinkingHidden = ref(false);
watch(
    () => [...currState.checkedKeys],
    (newKeys, oldKeys) => {
        if (isLinkingHidden.value) return;

        const newSet = new Set(newKeys);
        const oldSet = new Set(oldKeys);

        // 找出本次新增和移除的 key
        const added = newKeys.filter((k) => !oldSet.has(k));
        const removed = (oldKeys ?? []).filter((k) => !newSet.has(k));

        // 在完整权限树（allRoleList）中找对应节点
        const findNode = (nodes: TreeDataType[], key: string): TreeDataType | null => {
            for (const node of nodes) {
                if (String(node.menuId) === key) return node;
                const found = findNode(node.children ?? [], key);
                if (found) return found;
            }
            return null;
        };

        const toAdd: string[] = [];
        const toRemove: string[] = [];

        for (const key of added) {
            const node = findNode(allRoleList.value, key);
            if (node?.type === 2) {
                toAdd.push(...collectHiddenDescendants(node.children ?? []));
            }
        }
        for (const key of removed) {
            const node = findNode(allRoleList.value, key);
            if (node?.type === 2) {
                toRemove.push(...collectHiddenDescendants(node.children ?? []));
            }
        }

        if (!toAdd.length && !toRemove.length) return;

        isLinkingHidden.value = true;
        const merged = [...new Set([...newKeys, ...toAdd])].filter(
            (k) => !toRemove.includes(k),
        );
        currState.checkedKeys = merged;
        nextTick(() => {
            isLinkingHidden.value = false;
        });
    },
);

// 模块列表一旦准备好，默认自动聚焦第一个模块，保证中间树面板始终有内容。
watch(
    moduleList,
    (modules) => {
        if (!modules.length) {
            currentModuleKey.value = '';
            manualExpandedKeys.value = [];
            return;
        }

        if (!modules.some((item) => item.key === currentModuleKey.value)) {
            currentModuleKey.value = modules[0].key;
        }
    },
    { immediate: true },
);

// 当前模块切换后，默认只展开该模块根节点，避免树面板一上来信息过载。
watch(
    currentModule,
    (module) => {
        if (!module) {
            manualExpandedKeys.value = [];
            return;
        }

        manualExpandedKeys.value = [String(module.menuId)];
    },
);

onMounted(async () => {
    // 页面先拿到路由参数中的角色 ID，再按“权限树 -> 角色详情”顺序初始化。
    currState.roleId = roleId.value;
    await fetchRoleList();
    if (roleId.value) {
        fetchRoleListDetail();
    }
});
</script>

<template>
    <!-- 页面根容器直接锁定为当前内容区的一屏高度，避免被全局 table-container 的 fit-content 撑开。 -->
    <div class="table-container min-h-0 overflow-hidden" style="height: var(--content-pane-min-height)">
        <a-spin :loading="isSpinning" class="block h-full w-full overflow-hidden">
            <a-form
                ref="formRef"
                :model="currState"
                :rules="rules"
                layout="vertical"
                class="flex h-full min-h-0 flex-col"
            >
                <div class="shrink-0 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <a-form-item
                        :label="t('角色名称')"
                        field="roleName"
                        class="mb-0 xl:min-w-[360px] xl:flex-1"
                    >
                        <a-input
                            v-model="currState.roleName"
                            size="small"
                            class="w-full max-w-[420px]"
                            maxlength="10"
                            autocomplete="off"
                            :placeholder="t('请输入')"
                            :disabled="see"
                        />
                    </a-form-item>

                    <div class="grid gap-3 sm:grid-cols-3 xl:w-auto xl:min-w-[520px]">
                        <div class="rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface)] px-4 py-3">
                            <p class="text-xs text-[var(--app-text-muted)]">{{ t('模块导航') }}</p>
                            <p class="mt-1 text-xl font-semibold text-[var(--app-text)]">
                                {{ moduleList.length }}
                            </p>
                        </div>
                        <div class="rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface)] px-4 py-3">
                            <p class="text-xs text-[var(--app-text-muted)]">{{ t('已选权限') }}</p>
                            <p class="mt-1 text-xl font-semibold text-[var(--app-text)]">
                                {{ selectedPermissionCount }}
                            </p>
                        </div>
                        <div class="rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface)] px-4 py-3">
                            <p class="text-xs text-[var(--app-text-muted)]">{{ t('当前模块') }}</p>
                            <p class="mt-1 truncate text-sm font-semibold text-[var(--app-text)]">
                                {{ currentModule?.menuName || '--' }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 三栏主体统一锁定在当前页面可用高度内，避免任一栏内容过多时把整体布局继续向下撑开。 -->
                <div class="grid h-0 min-h-0 flex-1 !mt-0 gap-4 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:items-stretch">
                    <section
                        class="flex min-h-0 h-full flex-col overflow-hidden rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface)] p-3"
                    >
                        <div class="mb-3">
                            <p class="text-sm font-semibold text-[var(--app-text)]">{{ t('模块导航') }}</p>
                            <p class="mt-1 text-xs text-[var(--app-text-muted)]">
                                {{ t('切换模块查看对应权限树') }}
                            </p>
                        </div>

                        <!-- 模块按钮网格固定行高，避免单个标题撑高整行后造成卡片高度变形。 -->
                        <div class="grid h-0 min-h-0 flex-1 auto-rows-[60px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                            <button
                                v-for="module in moduleList"
                                :key="module.key"
                                type="button"
                                class="flex h-full w-full flex-col items-start justify-between overflow-hidden rounded-lg border px-3 py-1 text-left transition"
                                :class="
                                    currentModuleKey === module.key
                                        ? 'border-[var(--color-primary-6)] bg-[var(--app-control-bg)] text-[var(--app-text)]'
                                        : 'border-[var(--app-divider)] bg-[var(--app-surface-strong)] text-[var(--app-text-muted)] hover:border-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                                "
                                @click="focusModule(module.key)"
                            >
                                <span class="line-clamp-2 text-sm font-medium leading-4">{{ module.title }}</span>
                                <span
                                    class="rounded-full px-2 py-0 text-xs"
                                    :class="
                                        currentModuleKey === module.key
                                            ? 'bg-[var(--app-surface-strong)] text-[var(--color-primary-6)]'
                                            : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'
                                    "
                                >
                                    {{ selectedCountByModule[module.key] ?? 0 }}
                                </span>
                            </button>
                        </div>
                    </section>

                    <section class="flex min-h-0 h-full flex-col overflow-hidden rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface-strong)]">
                        <div class="border-b border-[var(--app-divider)] px-4 py-3">
                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p class="text-sm font-semibold text-[var(--app-text)]">
                                        {{ t('权限配置') }}
                                    </p>
                                    <p class="mt-1 text-xs text-[var(--app-text-muted)]">
                                        {{ t('当前模块：{name}', { name: currentModule?.menuName || '--' }) }}
                                    </p>
                                </div>

                                <div class="flex flex-wrap items-center gap-2">
                                    <a-input
                                        v-model="searchKeyword"
                                        allow-clear
                                        size="small"
                                        class="w-[240px]"
                                        :placeholder="t('快速定位权限')"
                                    >
                                        <template #prefix>
                                            <IconSearch />
                                        </template>
                                    </a-input>
                                    <a-checkbox v-model="onlySelected">
                                        {{ t('仅看已选') }}
                                    </a-checkbox>
                                    <a-button size="small" @click="expandAll">
                                        {{ t('展开全部') }}
                                    </a-button>
                                    <a-button size="small" @click="collapseAll">
                                        {{ t('收起全部') }}
                                    </a-button>
                                </div>
                            </div>
                        </div>

                        <div class="h-0 min-h-0 flex-1 overflow-y-auto p-4">
                            <a-tree
                                v-if="readonlyTreeData.length"
                                v-model:checked-keys="currState.checkedKeys"
                                :expanded-keys="displayedExpandedKeys"
                                :data="readonlyTreeData"
                                :field-names="{ children: 'children', title: 'menuName', key: 'menuId' }"
                                size="small"
                                checkable
                                @expand="handleExpand"
                            />
                            <a-empty
                                v-else
                                :description="onlySelected ? t('未选择任何权限') : t('暂无数据')"
                            />
                        </div>
                    </section>

                    <aside
                        class="flex min-h-0 h-full flex-col overflow-hidden rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface)] p-3"
                    >
                        <div class="mb-3">
                            <p class="text-sm font-semibold text-[var(--app-text)]">
                                {{ t('已选权限清单') }}
                            </p>
                            <p class="mt-1 text-xs text-[var(--app-text-muted)]">
                                {{ t('从已选清单点击可快速定位模块') }}
                            </p>
                        </div>

                        <div
                            v-if="groupedSelectedPermissions.length"
                            class="h-0 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
                        >
                            <div
                                v-for="group in groupedSelectedPermissions"
                                :key="group.key"
                                class="rounded-lg border border-[var(--app-divider)] bg-[var(--app-surface-strong)] p-3"
                            >
                                <div class="mb-2 flex items-center justify-between">
                                    <button
                                        type="button"
                                        class="truncate text-left text-sm font-semibold text-[var(--app-text)]"
                                        @click="focusModule(group.key)"
                                    >
                                        {{ group.title }}
                                    </button>
                                    <span class="text-xs text-[var(--app-text-muted)]">
                                        {{ t('共 {count} 项', { count: group.permissions.length }) }}
                                    </span>
                                </div>

                                <div class="space-y-2">
                                    <div
                                        v-for="permission in group.permissions"
                                        :key="permission.key"
                                        class="flex items-start justify-between gap-2 rounded-md bg-[var(--app-surface)] px-2 py-1.5"
                                    >
                                        <button
                                            type="button"
                                            class="min-w-0 flex-1 text-left"
                                            @click="focusModule(permission.moduleKey)"
                                        >
                                            <p class="truncate text-sm text-[var(--app-text)]">
                                                {{ permission.title }}
                                            </p>
                                            <p class="truncate text-xs text-[var(--app-text-muted)]">
                                                {{ permission.path.join(' / ') }}
                                            </p>
                                        </button>
                                        <a-button
                                            v-if="!see"
                                            type="text"
                                            size="mini"
                                            class="!px-0 text-[var(--app-text-muted)] hover:!text-rose-500"
                                            @click="removePermission(permission.key, permission.moduleKey)"
                                        >
                                            ×
                                        </a-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex min-h-0 flex-1 items-center justify-center">
                            <a-empty :description="t('未选择任何权限')" />
                        </div>
                    </aside>
                </div>

                <div
                    class="mt-5 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-divider)] bg-[var(--app-surface-strong)] px-4 py-3"
                >
                    <div class="flex flex-wrap items-center gap-3 text-sm text-[var(--app-text-muted)]">
                        <span>{{ t('已选 {count} 项', { count: selectedPermissionCount }) }}</span>
                        <span class="text-[var(--app-divider)]">|</span>
                        <span>
                            {{ t('当前模块：{name}', { name: currentModule?.menuName || '--' }) }}
                        </span>
                    </div>

                    <div class="flex items-center gap-3">
                        <a-button size="small" :disabled="isLoading" @click.stop="handleBack">
                            {{ see ? t('返回') : t('取消') }}
                        </a-button>
                        <a-button
                            v-if="!see"
                            type="primary"
                            size="small"
                            :loading="isLoading"
                            @click.stop="handleSaveData"
                        >
                            {{ t('确认') }}
                        </a-button>
                    </div>
                </div>
            </a-form>
        </a-spin>
    </div>
</template>
