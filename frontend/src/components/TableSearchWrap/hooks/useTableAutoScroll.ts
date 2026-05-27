import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ColumnType, TableScrollConfig } from '@/interface/TableType'

/**
 * 表格区域最小纵向滚动高度。
 * 即使屏幕再高，也保证列表区域至少维持一个稳定、可阅读的高度。
 */
const TABLE_MIN_SCROLL_Y = 600

/**
 * 表格底部预留间距。
 * 用于避免分页贴住视口底部，保持视觉留白和可点击空间。
 */
const TABLE_BOTTOM_GAP = 50

/**
 * 表格响应式横向滚动断点。
 * 项目按 1920 宽屏设计，低于 1550 时不再压缩列宽，而是开启横向滚动。
 */
const TABLE_RESPONSIVE_SCROLL_BREAKPOINT = 1550

/**
 * 未声明 width 的列按字段类型估算最小宽度。
 * 这个值只用于 scroll.x，不会直接改写业务列配置。
 */
const DEFAULT_COLUMN_MIN_WIDTH = 140

const getViewportWidth = (): number => {
    if (typeof window === 'undefined') return 1920
    return window.innerWidth
}

interface UseTableAutoScrollOptions {
    tableContainerRef: Ref<HTMLElement | null>
    baseScrollConfig: ComputedRef<TableScrollConfig>
    columns: ComputedRef<ColumnType[]>
    skeletonRows: ComputedRef<number>
    columnCount: ComputedRef<number>
    watchDeps: ComputedRef<unknown[]>
}

/**
 * 自动滚动高度与骨架布局计算。
 * 目的：
 * 1. 让 scroll.y 随真实视口高度变化
 * 2. 在 loading 且无数据时，骨架高度与表格高度保持一致
 */
export default function useTableAutoScroll({
    tableContainerRef,
    baseScrollConfig,
    columns,
    skeletonRows,
    columnCount,
    watchDeps,
}: UseTableAutoScrollOptions) {
    /**
     * 当前自动计算后的纵向滚动高度。
     * 当页面高度、表头/分页高度、数据量变化时都会重算。
     */
    const autoScrollY = shallowRef<number>(TABLE_MIN_SCROLL_Y)
    const viewportWidth = shallowRef<number>(getViewportWidth())
    const tableContainerWidth = shallowRef<number>(0)

    /**
     * 只有当外部显式声明了 scroll.y，才启用自动高度计算。
     * 这里把传入 y 视为“需要纵向滚动”的信号，并作为最小高度基准。
     */
    const shouldAutoScrollY = computed(() => typeof baseScrollConfig.value.y !== 'undefined')

    const getLeafColumns = (columnList: ColumnType[]): ColumnType[] =>
        columnList.flatMap((column) =>
            column.children?.length ? getLeafColumns(column.children) : [column],
        )

    const parseColumnWidth = (width: ColumnType['width']): number | null => {
        if (typeof width === 'number' && Number.isFinite(width)) return width

        if (typeof width === 'string') {
            const trimmedWidth = width.trim()
            if (!/^\d+(\.\d+)?(?:px)?$/i.test(trimmedWidth)) return null

            const numericWidth = Number.parseFloat(trimmedWidth)
            if (Number.isFinite(numericWidth)) return numericWidth
        }

        return null
    }

    const estimateColumnWidth = (column: ColumnType): number => {
        const declaredWidth = parseColumnWidth(column.width)
        if (declaredWidth !== null) return declaredWidth

        const dataIndex = String(column.dataIndex ?? '').toLowerCase()
        const title = String(column.title ?? '')
        const signature = `${dataIndex}${title}`

        if (/action|操作/.test(signature)) return 200
        if (/(time|date|创建日期|创建时间|更新时间|日期|时间)/i.test(signature)) return 180
        if (/(email|邮箱)/i.test(signature)) return 180
        if (/(uid|^id$|user.?id|account.?id|编号|邀请码|单号|流水号|订单号)/i.test(signature)) {
            return 170
        }
        if (/(status|state|状态|认证)/i.test(signature)) return 130
        if (/(type|country|national|证件|国家|国籍|手机号)/i.test(signature)) return 140
        if (/(sex|gender|区号|姓|名|标签|类型)/i.test(signature)) return 110

        return DEFAULT_COLUMN_MIN_WIDTH
    }

    const estimatedScrollX = computed(() =>
        getLeafColumns(columns.value).reduce(
            (totalWidth, column) => totalWidth + estimateColumnWidth(column),
            0,
        ),
    )

    const shouldEnableResponsiveScrollX = computed(() => {
        if (!estimatedScrollX.value) return false
        if (viewportWidth.value < TABLE_RESPONSIVE_SCROLL_BREAKPOINT) return true
        if (!tableContainerWidth.value) return false

        return estimatedScrollX.value > tableContainerWidth.value
    })

    const getResponsiveScrollX = (): TableScrollConfig['x'] => {
        const baseScrollX = baseScrollConfig.value.x

        if (!shouldEnableResponsiveScrollX.value) return baseScrollX

        if (typeof baseScrollX === 'number' && Number.isFinite(baseScrollX)) {
            return Math.max(baseScrollX, estimatedScrollX.value)
        }

        if (typeof baseScrollX === 'string') {
            const numericScrollX = Number.parseInt(baseScrollX, 10)
            if (Number.isFinite(numericScrollX)) {
                return Math.max(numericScrollX, estimatedScrollX.value)
            }
        }

        if (baseScrollX === true) return true

        return estimatedScrollX.value
    }

    /**
     * 读取自动滚动的最低高度：
     * - 不低于组件默认 600
     * - 如果外部传入更大的 y，则以外部值为准
     */
    const getMinScrollY = (): number => {
        const scrollY = baseScrollConfig.value.y

        if (typeof scrollY === 'number' && Number.isFinite(scrollY)) {
            return Math.max(scrollY, TABLE_MIN_SCROLL_Y)
        }

        return TABLE_MIN_SCROLL_Y
    }

    /**
     * 根据真实 DOM 位置动态计算可用表格高度。
     * 计算逻辑：
     * 1. 视口高度 - 表格容器 top - 底部留白
     * 2. 再减去表头高度和分页高度
     * 3. 最终值与最小高度取最大值
     */
    const syncAutoScrollY = (): void => {
        viewportWidth.value = getViewportWidth()

        if (tableContainerRef.value) {
            tableContainerWidth.value = tableContainerRef.value.getBoundingClientRect().width
        }

        if (!shouldAutoScrollY.value || !tableContainerRef.value) return

        const tableRect = tableContainerRef.value.getBoundingClientRect()
        const tableHeader = tableContainerRef.value.querySelector(
            '.arco-table-header',
        ) as HTMLElement | null
        const tablePagination = tableContainerRef.value.querySelector(
            '.arco-pagination',
        ) as HTMLElement | null

        const availableViewportHeight =
            (typeof window === 'undefined' ? TABLE_MIN_SCROLL_Y : window.innerHeight) -
            tableRect.top -
            TABLE_BOTTOM_GAP
        const occupiedHeight = (tableHeader?.offsetHeight ?? 46) + (tablePagination?.offsetHeight ?? 64)

        autoScrollY.value = Math.max(
            Math.floor(availableViewportHeight - occupiedHeight),
            getMinScrollY(),
        )
    }

    /**
     * 最终传给 a-table 的 scroll 配置：
     * 启用自动高度时，用动态 y 覆盖静态 y。
     */
    const mergedScrollConfig = computed<TableScrollConfig>(() => {
        const responsiveScrollX = getResponsiveScrollX()

        if (!shouldAutoScrollY.value) {
            return {
                ...baseScrollConfig.value,
                x: responsiveScrollX,
            }
        }

        return {
            ...baseScrollConfig.value,
            x: responsiveScrollX,
            y: autoScrollY.value,
        }
    })

    /**
     * 骨架高度与行列数统一由当前滚动高度推导，
     * 避免 loading 态和真实表格高度跳变。
     */
    const skeletonMinHeight = computed(() => {
        if (shouldAutoScrollY.value) {
            return `${autoScrollY.value}px`
        }

        return `${TABLE_MIN_SCROLL_Y}px`
    })

    const skeletonRowCount = computed(() => {
        const estimatedRows = Math.ceil(
            (Number.parseInt(skeletonMinHeight.value, 10) || TABLE_MIN_SCROLL_Y) / 68,
        )
        return Math.max(skeletonRows.value, estimatedRows)
    })

    const skeletonColumnCount = computed(() => Math.min(Math.max(columnCount.value, 4), 6))

    /**
     * 每行骨架宽度做轻微错位，减少“机械重复感”。
     */
    const getSkeletonCellWidth = (rowIndex: number, columnIndex: number): string => {
        const widthMatrix = [
            ['90%', '62%', '80%', '68%', '86%', '54%'],
            ['72%', '58%', '88%', '60%', '76%', '50%'],
            ['84%', '64%', '74%', '70%', '92%', '56%'],
        ]

        return widthMatrix[rowIndex % widthMatrix.length][columnIndex] ?? '70%'
    }

    let tableResizeObserver: ResizeObserver | null = null

    onMounted(() => {
        nextTick(() => {
            syncAutoScrollY()
        })

        if (typeof ResizeObserver !== 'undefined' && tableContainerRef.value) {
            tableResizeObserver = new ResizeObserver(() => {
                syncAutoScrollY()
            })
            tableResizeObserver.observe(tableContainerRef.value)
        }

        window.addEventListener('resize', syncAutoScrollY)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', syncAutoScrollY)
        tableResizeObserver?.disconnect()
        tableResizeObserver = null
    })

    /**
     * 搜索区开合、工具栏显隐、分页变化、数据量变化都会影响可用高度，
     * 所以统一在 nextTick 后重算一次 scroll.y。
     */
    watch(watchDeps, () => {
        nextTick(() => {
            syncAutoScrollY()
        })
    })

    /**
     * 当外部 scroll.y 基线发生变化时，立即同步一次高度。
     */
    watch(
        () => baseScrollConfig.value.y,
        () => {
            nextTick(() => {
                syncAutoScrollY()
            })
        },
    )

    /**
     * 列配置或外部 scroll.x 变化时，同步容器宽度。
     * 这样新增/隐藏列后，横向滚动阈值能立即按最新列宽重新判断。
     */
    watch([estimatedScrollX, () => baseScrollConfig.value.x], () => {
        nextTick(() => {
            syncAutoScrollY()
        })
    })

    return {
        mergedScrollConfig,
        skeletonMinHeight,
        skeletonRowCount,
        skeletonColumnCount,
        getSkeletonCellWidth,
    }
}
