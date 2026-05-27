<script setup lang="ts">
import SearchWrap from './SearchWrap/Index.vue'
import CellEllipsis from './components/CellEllipsis.vue'
import CopyableText from './components/CopyableText.vue'
import ExportButton from './components/ExportButton.vue'
import LabelTagList from './components/LabelTagList.vue'
import PermissionButton from './components/PermissionButton.vue'
import StatusText from './components/StatusText.vue'
import type {
    SearchParams,
    TableSearchFormExpose,
    TableToolbarButtonConfig,
    TableSearchWrapExpose,
    TableSearchWrapProps,
    TableScrollConfig,
} from '@/interface/TableType'
import { PagingDefaultConf } from '@/utils/constant'
import useTableSorter from '@/use/useTableSorter'
import useTableAutoScroll from './hooks/useTableAutoScroll'
import useTableCellPreset from './hooks/useTableCellPreset'
import useTableCellRender from './hooks/useTableCellRender'
import useTablePagination from './hooks/useTablePagination'

const props = withDefaults(defineProps<TableSearchWrapProps>(), {
    searchConf: () => [],
    isMore: true,
    exportConfig: null,
    toolbarButtons: () => [],
    defaultParams: () => ({}),
    immediate: true,
    rowKey: 'id',
    emptyText: '暂无数据',
    scroll: () => ({ x: 1000 }),
    tableProps: () => ({}),
    showRefresh: false,
    showSkeleton: true,
    skeletonRows: 8,
    enableColumnSort: true,
})

const { t } = useI18n()
const slots = useSlots()

/**
 * 工具栏按钮配置统一过滤：
 * - show=false 时不渲染
 * - 其它场景默认展示
 */
const visibleToolbarButtons = computed<TableToolbarButtonConfig[]>(() =>
    props.toolbarButtons.filter((button) => button.show !== false),
)

const handleToolbarButtonClick = (button: TableToolbarButtonConfig): void => {
    button.onClick?.()
}

/**
 * 搜索表单实例。
 * reset 时优先通过表单实例恢复 UI 状态。
 */
const searchWrapRef = ref<TableSearchFormExpose | null>(null)

/**
 * 表格容器 DOM。
 * 自动滚动高度计算会依赖该容器的真实位置和尺寸。
 */
const tableContainerRef = ref<HTMLElement | null>(null)

/**
 * 请求与分页状态统一下沉到 composable，
 * Index.vue 只负责“组合能力 + 模板渲染”。
 */
const {
    loading,
    currentSearchParams,
    rawDataSource,
    currentPageNo,
    currentPageSize,
    totalCount,
    requestSearch,
    requestRefresh,
    resetTable,
    getSearchParams,
    onPageChange,
    onPageSizeChange,
} = useTablePagination({
    props,
    searchWrapRef,
})

/**
 * 表格排序能力统一交给 useTableSorter 管理：
 * 1. 搜索字段排序
 * 2. 当前列点击排序
 * 3. 文本/数字/时间/枚举的统一比较规则
 */
const { normalizedColumns, onSorterChange, sortedDataSource, sortRecords } = useTableSorter({
    columns: computed(() => props.tableColumns),
    rawDataSource,
    searchConf: computed(() => props.searchConf),
    currentSearchParams,
    searchSorter: computed(() => props.searchSorter),
    enableColumnSort: props.enableColumnSort,
})

/**
 * 表格最终渲染数据。
 * 始终以排序后的数据源为准，让分页、刷新和筛选结果共享同一套展示语义。
 */
const dataSource = computed<Record<string, unknown>[]>(() => sortedDataSource.value)

/**
 * 对外暴露的 search/refresh 返回值仍保持“已排序列表”，
 * 确保外部页面调用组件方法时语义不变。
 */
const searchTable = async (
    params: SearchParams = currentSearchParams.value,
): Promise<unknown[]> => {
    const result = await requestSearch(params)
    return sortRecords(result)
}

const refreshTable = async (): Promise<unknown[]> => {
    const result = await requestRefresh()
    return sortRecords(result)
}

/**
 * 普通文本列的自动省略、预览弹层、以及 cellPreset 内置 slot 注入。
 */
const {
    renderableColumns,
    slotColumns,
    hasExternalSlot,
    isAutoEllipsisSlot,
    isCellPresetSlot,
    isTimeLikeColumn,
    canPreviewCellText,
    getCellDisplayText,
    handleCopyPopoverText,
} = useTableCellRender({
    columns: normalizedColumns,
    slots,
})

/**
 * cellPreset 相关的类型收窄、字段读取、动作按钮行为统一收敛。
 */
const {
    isLabelTagsCellPreset,
    isPercentTextCellPreset,
    isStatusTextCellPreset,
    isActionButtonsCellPreset,
    pickPresetStatusValue,
    pickPresetPercentText,
    pickPresetLabelList,
    pickPresetLabelNames,
    shouldRenderPresetLabelTags,
    pickPresetLabelFallbackText,
    pickPresetLabelFallbackTooltip,
    isActionButtonVisible,
    isActionButtonDisabled,
    getActionButtonLoading,
    getActionButtonStatus,
    getActionButtonText,
    pickPresetCopyText,
    pickPresetCopyableText,
    handleActionButtonClick,
    isCopyableTextCellPreset,
} = useTableCellPreset({ t })

/**
 * 导出参数默认和“当前筛选 + 当前分页”保持一致。
 */
const exportParams = computed<Record<string, unknown>>(() => ({
    ...getSearchParams(),
    pageNo: currentPageNo.value,
    pageSize: currentPageSize.value,
}))

/**
 * 是否展示工具栏。
 */
const showToolbar = computed(
    () =>
        Boolean(props.exportConfig) ||
        props.showRefresh ||
        visibleToolbarButtons.value.length > 0 ||
        Boolean(slots.roleBtnWrap) ||
        Boolean(slots.totalWrap) ||
        Boolean(slots.actionsWrap),
)

/**
 * 首屏骨架屏显示条件：
 * - 开启骨架功能
 * - 当前处于 loading
 * - 还没有真实数据
 */
const showTableSkeleton = computed(
    () => props.showSkeleton && loading.value && dataSource.value.length === 0,
)

/**
 * 基础滚动配置。
 * 优先使用外部 tableProps.scroll，其次回退到组件 props.scroll。
 */
const baseScrollConfig = computed<TableScrollConfig>(() => {
    const scrollConfig = props.tableProps.scroll ?? props.scroll
    return scrollConfig && typeof scrollConfig === 'object' ? { ...scrollConfig } : {}
})

/**
 * 自动滚动高度和骨架尺寸统一由 composable 管理，
 * 组件层仅提供依赖源（数据量、分页、工具栏状态等）。
 */
const {
    mergedScrollConfig,
    skeletonMinHeight,
    skeletonRowCount,
    skeletonColumnCount,
    getSkeletonCellWidth,
} = useTableAutoScroll({
    tableContainerRef,
    baseScrollConfig,
    columns: renderableColumns,
    skeletonRows: computed(() => props.skeletonRows),
    columnCount: computed(() => normalizedColumns.value.length || 0),
    watchDeps: computed(() => [
        props.searchConf.length,
        showToolbar.value,
        loading.value,
        totalCount.value,
        currentPageNo.value,
        currentPageSize.value,
        dataSource.value.length,
    ]),
})

/**
 * 合并表格 locale 配置。
 * 优先尊重外部 tableProps.locale，其次兜底 emptyText 的 i18n 文案。
 */
const getTableLocale = (): Record<string, unknown> => {
    const locale =
        props.tableProps.locale && typeof props.tableProps.locale === 'object'
            ? (props.tableProps.locale as Record<string, unknown>)
            : {}

    return {
        ...locale,
        emptyText: locale.emptyText ?? t(props.emptyText),
    }
}

/**
 * Arco Table 分页配置。
 * 保持和页面侧通过 slot 读取 pagination.current/pageSize 的兼容行为。
 */
const paginationConfig = computed(() => ({
    ...PagingDefaultConf,
    current: currentPageNo.value,
    pageSize: currentPageSize.value,
    total: totalCount.value,
}))

/**
 * 合并最终表格 props。
 */
const mergedTableProps = computed(() => ({
    ...props.tableProps,
    rowKey: props.rowKey,
    scroll: mergedScrollConfig.value,
    locale: getTableLocale(),
    pagination: props.tableProps.pagination ?? paginationConfig.value,
}))

/**
 * 当骨架屏接管内容区域时，不再开启 a-table 内置 loading，
 * 避免表头和内容区出现双重 loading 反馈。
 */
const tableLoading = computed(() => loading.value && !showTableSkeleton.value)

/**
 * 对外暴露的命令式方法保持不变，
 * 页面层无需感知内部逻辑已经拆分到 hooks。
 */
defineExpose<TableSearchWrapExpose>({
    refresh: refreshTable,
    search: searchTable,
    reset: resetTable,
    getSearchParams,
})
</script>
<template>
    <div class="table-container flex h-auto min-h-0 flex-col gap-[14px]">
        <!-- 搜索区域：如果页面传了 searchConf 或自定义 searchWrap，就显示 -->
        <div
            v-if="props.searchConf.length || slots.searchWrap"
            class="rounded-[10px] bg-transparent pb-[14px]"
        >
            <slot name="searchWrap">
                <SearchWrap
                    v-if="props.searchConf.length"
                    ref="searchWrapRef"
                    :search-conf="props.searchConf"
                    :is-more="props.isMore"
                    @searchCallback="searchTable"
                >
                    <template #footerActions>
                        <PermissionButton
                            v-for="(button, buttonIndex) in visibleToolbarButtons"
                            :key="`footer-toolbar-button-${button.buttonKey || button.text}-${buttonIndex}`"
                            :button-key="button.buttonKey"
                            :route-name="button.routeName"
                            :type="button.type"
                            :status="button.status"
                            :size="button.size"
                            :disabled="button.disabled"
                            :loading="button.loading"
                            :hide-when-no-permission="button.hideWhenNoPermission"
                            @click="handleToolbarButtonClick(button)"
                        >
                            {{ t(button.text) }}
                        </PermissionButton>
                        <ExportButton
                            v-if="props.exportConfig"
                            :config="props.exportConfig"
                            :params="exportParams"
                        />
                        <slot name="roleBtnWrap" />
                    </template>
                </SearchWrap>
            </slot>
        </div>

        <!-- 工具栏：按钮区、统计区、操作区统一放在这里 -->
        <div v-if="showToolbar" class="flex flex-wrap items-center justify-between gap-3 pb-[10px]">
            <div class="flex flex-wrap items-center gap-3">
                <PermissionButton
                    v-for="(button, buttonIndex) in visibleToolbarButtons"
                    :key="`toolbar-button-${button.buttonKey || button.text}-${buttonIndex}`"
                    :button-key="button.buttonKey"
                    :route-name="button.routeName"
                    :type="button.type"
                    :status="button.status"
                    :size="button.size"
                    :disabled="button.disabled"
                    :loading="button.loading"
                    :hide-when-no-permission="button.hideWhenNoPermission"
                    @click="handleToolbarButtonClick(button)"
                >
                    {{ t(button.text) }}
                </PermissionButton>
                <slot name="roleBtnWrap" />
                <ExportButton
                    v-if="props.exportConfig"
                    :config="props.exportConfig"
                    :params="exportParams"
                />
                <slot
                    name="totalWrap"
                    :total="totalCount"
                    :data-source="dataSource"
                    :loading="loading"
                />
            </div>
            <div class="flex flex-wrap items-center justify-end gap-3">
                <slot
                    name="actionsWrap"
                    :refresh="refreshTable"
                    :reset="resetTable"
                    :loading="loading"
                    :search-params="getSearchParams()"
                />
                <a-button v-if="props.showRefresh" @click="refreshTable">
                    {{ t('刷新') }}
                </a-button>
            </div>
        </div>

        <!-- 表格主体区域：scroll.y 会在这里按真实 DOM 高度自动计算 -->
        <div
            ref="tableContainerRef"
            class="overflow-hidden rounded-[10px] bg-[var(--app-surface-strong)] [&_.arco-table-container]:rounded-[4px] [&_.arco-table-container]:border-0 [&_.arco-table-th]:border-0 [&_.arco-table-th]:bg-[var(--app-table-header-bg)] [&_.arco-table-th]:font-semibold [&_.arco-table-th]:text-[var(--app-table-header-text)] [&_.arco-table-th]:whitespace-nowrap [&_.arco-table-th_.arco-table-th-item]:whitespace-nowrap [&_.arco-table-td]:border-0 [&_.arco-table-tr-empty_.arco-table-td]:p-0 [&_.arco-table-tr:hover_.arco-table-td]:bg-[var(--app-table-row-hover)]"
        >
            <slot
                name="table"
                :data-source="dataSource"
                :loading="loading"
                :pagination="paginationConfig"
                :refresh="refreshTable"
                :reset="resetTable"
                :search-params="getSearchParams()"
            >
                <a-table
                    v-bind="mergedTableProps"
                    class="w-full"
                    :columns="renderableColumns"
                    :data="dataSource"
                    :loading="tableLoading"
                    @page-size-change="onPageSizeChange"
                    @page-change="onPageChange"
                    @sorter-change="onSorterChange"
                >
                    <!-- 空状态区域：首屏加载时显示内容骨架，否则显示正常 empty 文案 -->
                    <template #empty>
                        <div
                            v-if="showTableSkeleton"
                            class="flex w-full flex-col px-4 py-4"
                            :style="{ minHeight: skeletonMinHeight }"
                        >
                            <!-- 只模拟列表内容，不额外绘制表头骨架 -->
                            <div class="flex flex-1 flex-col divide-y divide-[var(--app-divider)]">
                                <div
                                    v-for="rowIndex in skeletonRowCount"
                                    :key="`skeleton-row-${rowIndex}`"
                                    class="grid items-center gap-4 py-4"
                                    :style="{
                                        gridTemplateColumns: `repeat(${skeletonColumnCount}, minmax(0, 1fr))`,
                                    }"
                                >
                                    <div
                                        v-for="columnIndex in skeletonColumnCount"
                                        :key="`skeleton-cell-${rowIndex}-${columnIndex}`"
                                        class="h-3 animate-pulse rounded-full bg-[var(--app-skeleton-bg)]"
                                        :style="{
                                            width: getSkeletonCellWidth(rowIndex, columnIndex - 1),
                                        }"
                                    />
                                </div>
                            </div>
                        </div>
                        <div v-else class="py-8 text-center text-sm text-[var(--app-text-muted)]">
                            {{ t(props.emptyText) }}
                        </div>
                    </template>

                    <template
                        v-for="column in slotColumns"
                        :key="column.key"
                        #[column.slotName]="slotProps"
                    >
                        <slot
                            v-if="hasExternalSlot(column.slotName)"
                            :name="column.slotName"
                            v-bind="{
                                ...slotProps,
                                pagination: paginationConfig,
                                loading,
                                dataSource,
                                searchParams: getSearchParams(),
                            }"
                        />
                        <template v-else-if="isCellPresetSlot(column.slotName)">
                            <LabelTagList
                                v-if="
                                    isLabelTagsCellPreset(column.cellPreset) &&
                                    shouldRenderPresetLabelTags(
                                        slotProps.record,
                                        column.cellPreset,
                                    )
                                "
                                :label-list="
                                    pickPresetLabelList(slotProps.record, column, column.cellPreset)
                                "
                                :label-names="
                                    pickPresetLabelNames(slotProps.record, column.cellPreset)
                                "
                                :max-visible="column.cellPreset.maxVisible"
                                :empty-text="column.cellPreset.emptyText"
                            />
                            <a-tooltip
                                v-else-if="isLabelTagsCellPreset(column.cellPreset)"
                                :content="
                                    pickPresetLabelFallbackTooltip(
                                        slotProps.record,
                                        column,
                                        column.cellPreset,
                                    ) || column.cellPreset.emptyText || '--'
                                "
                            >
                                <span class="block max-w-full truncate">
                                    {{
                                        pickPresetLabelFallbackText(
                                            slotProps.record,
                                            column,
                                            column.cellPreset,
                                        ) || column.cellPreset.emptyText || '--'
                                    }}
                                </span>
                            </a-tooltip>
                            <StatusText
                                v-else-if="isStatusTextCellPreset(column.cellPreset)"
                                :value="
                                    pickPresetStatusValue(
                                        slotProps.record,
                                        column,
                                        column.cellPreset,
                                    )
                                "
                                :preset="column.cellPreset.preset"
                                :fallback="column.cellPreset.fallback"
                                :show-raw-when-unknown="column.cellPreset.showRawWhenUnknown"
                            />
                            <span
                                v-else-if="isPercentTextCellPreset(column.cellPreset)"
                                class="block max-w-full truncate"
                            >
                                {{
                                    pickPresetPercentText(
                                        slotProps.record,
                                        column,
                                        column.cellPreset,
                                    )
                                }}
                            </span>
                            <CopyableText
                                v-else-if="isCopyableTextCellPreset(column.cellPreset)"
                                :text="
                                    pickPresetCopyableText(
                                        slotProps.record,
                                        column,
                                        column.cellPreset,
                                    )
                                "
                                :copy-text="
                                    pickPresetCopyText(
                                        slotProps.record,
                                        column,
                                        column.cellPreset,
                                    )
                                "
                            />
                            <div
                                v-else-if="isActionButtonsCellPreset(column.cellPreset)"
                                :class="
                                    column.cellPreset.wrapClass || 'flex flex-wrap items-center'
                                "
                            >
                                <div
                                    :class="
                                        column.cellPreset.gapClass ||
                                        'flex flex-wrap items-center gap-3'
                                    "
                                >
                                    <template
                                        v-for="(button, buttonIndex) in column.cellPreset.buttons"
                                        :key="`${button.buttonKey || 'action'}-${buttonIndex}`"
                                    >
                                        <PermissionButton
                                            v-if="isActionButtonVisible(button, slotProps.record)"
                                            :button-key="button.buttonKey"
                                            :type="button.type"
                                            :status="
                                                getActionButtonStatus(button, slotProps.record)
                                            "
                                            :size="button.size || 'mini'"
                                            :hide-when-no-permission="
                                                button.hideWhenNoPermission ?? true
                                            "
                                            :disabled="
                                                isActionButtonDisabled(button, slotProps.record)
                                            "
                                            :loading="
                                                getActionButtonLoading(button, slotProps.record)
                                            "
                                            @click="
                                                handleActionButtonClick(button, slotProps.record)
                                            "
                                        >
                                            {{ getActionButtonText(button, slotProps.record) }}
                                        </PermissionButton>
                                    </template>
                                </div>
                            </div>
                            <span v-else>--</span>
                        </template>
                        <template v-else-if="isAutoEllipsisSlot(column.slotName)">
                            <!--
                                单元格自动省略 + 按需弹出全文交互。
                                用 DOM overflow 检测（scrollWidth > offsetWidth）替代
                                字符数启发式估算，确保只有真正被截断的单元格才：
                                  1. 变为主色高亮 + cursor-pointer
                                  2. 激活 popover（通过 :disabled 控制）
                                未截断的短文本保持普通文本颜色，无交互噪音。
                            -->
                            <CellEllipsis
                                :text="getCellDisplayText(slotProps.record, column)"
                                :show-copy="!isTimeLikeColumn(column)"
                                :copyable="canPreviewCellText(getCellDisplayText(slotProps.record, column), column)"
                                @copy="handleCopyPopoverText"
                            /></template>
                    </template>
                </a-table>
            </slot>
        </div>
    </div>
</template>
