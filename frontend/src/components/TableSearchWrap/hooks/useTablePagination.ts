import { usePagination } from 'vue-request'
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type {
    SearchParams,
    TableFetchResult,
    TableSearchFormExpose,
    TableSearchWrapProps,
} from '@/interface/TableType'
import { PagingDefaultConf } from '@/utils/constant'
import { normalizeTableFetchResult } from '@/utils/table'

interface UseTablePaginationOptions {
    props: TableSearchWrapProps
    searchWrapRef: Ref<TableSearchFormExpose | null>
}

/**
 * 统一管理 TableSearchWrap 的请求与分页状态。
 * 目标是把“请求生命周期 + 搜索参数缓存 + 分页联动”从组件里剥离出去，
 * 让组件本身只做布局和渲染组合。
 */
export default function useTablePagination({ props, searchWrapRef }: UseTablePaginationOptions) {
    /**
     * 当前实际生效的查询参数。
     * 这里作为“业务筛选条件缓存”，让翻页、刷新、分页切换都能沿用同一组搜索条件。
     */
    const currentSearchParams = ref<SearchParams>({ ...props.defaultParams })

    /**
     * 请求层统一使用 vue-request 的 usePagination:
     * 1. 分页状态由库维护
     * 2. 保持 pageNo/pageSize/totalSize 的后端字段兼容
     * 3. 页面仍可通过 search/reset/refresh 这套命令式 API 控制
     */
    const {
        data: tableResult,
        loading,
        runAsync: runTableRequest,
        refreshAsync,
        current,
        pageSize,
        total,
        changeCurrent,
        changePageSize,
    } = usePagination<TableFetchResult, [SearchParams & { pageNo: number; pageSize: number }]>(
        async (params) => {
            const response = await props.apiFetch({
                ...props.defaultParams,
                ...params,
            })

            /**
             * 统一兼容页面侧多种返回形态：
             * - 纯数组（非分页接口）
             * - 标准分页结构
             * - 历史字段差异对象（pageNum/total 等）
             */
            return normalizeTableFetchResult(response, params)
        },
        {
            manual: true,
            defaultParams: [
                {
                    ...props.defaultParams,
                    pageNo: PagingDefaultConf.current,
                    pageSize: PagingDefaultConf.pageSize,
                },
            ],
            pagination: {
                currentKey: 'pageNo',
                pageSizeKey: 'pageSize',
                totalKey: 'totalSize',
                totalPageKey: 'totalPages',
            },
        },
    )

    /**
     * 当前列表数据（原始顺序）。
     * 这里不做排序处理，排序由外层 useTableSorter 统一接管。
     */
    const rawDataSource = computed<Record<string, unknown>[]>(() => tableResult.value?.list ?? [])

    /**
     * 展示层分页信息优先取服务端回传，
     * 避免后端校正页码后，前端仍显示旧分页状态。
     */
    const currentPageNo = computed(() => Number(tableResult.value?.pageNo ?? current.value ?? 1))
    const currentPageSize = computed(() =>
        Number(tableResult.value?.pageSize ?? pageSize.value ?? PagingDefaultConf.pageSize),
    )
    const totalCount = computed(() => Number(total.value ?? 0))

    /**
     * 搜索时重置到第一页，并覆盖当前参数缓存。
     * 返回值只返回原始 list，调用方可按需要继续做排序或二次处理。
     */
    const requestSearch = async (
        params: SearchParams = currentSearchParams.value,
    ): Promise<Record<string, unknown>[]> => {
        currentSearchParams.value = {
            ...props.defaultParams,
            ...params,
        }

        const result = await runTableRequest({
            ...currentSearchParams.value,
            pageNo: 1,
            pageSize: currentPageSize.value,
        })

        return result.list
    }

    /**
     * 刷新沿用当前条件与分页。
     * 如果还没发起过请求，则补一次 search，避免 refresh 空转。
     */
    const requestRefresh = async (): Promise<Record<string, unknown>[]> => {
        if (!tableResult.value) {
            return requestSearch(currentSearchParams.value)
        }

        const result = await refreshAsync()
        return result.list
    }

    /**
     * 重置优先通过 SearchWrap 实例恢复表单 UI，
     * 如果实例不存在，再退回到默认条件 + 默认分页重新请求。
     */
    const resetTable = (): void => {
        if (searchWrapRef.value) {
            searchWrapRef.value.reset()
            return
        }

        currentSearchParams.value = { ...props.defaultParams }
        void runTableRequest({
            ...currentSearchParams.value,
            pageNo: 1,
            pageSize: PagingDefaultConf.pageSize,
        })
    }

    /**
     * 对外只暴露参数拷贝，避免调用方直接篡改内部缓存状态。
     */
    const getSearchParams = (): SearchParams => ({ ...currentSearchParams.value })

    const onPageChange = (pageNo: number): void => {
        changeCurrent(pageNo)
    }

    const onPageSizeChange = (nextPageSize: number): void => {
        changePageSize(nextPageSize)
    }

    if (props.immediate) {
        void runTableRequest({
            ...props.defaultParams,
            pageNo: PagingDefaultConf.current,
            pageSize: PagingDefaultConf.pageSize,
        })
    }

    return {
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
    }
}
