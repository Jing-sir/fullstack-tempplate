import type { ColumnType } from '@/interface/StateType'
import allToRaw from '@/utils/allToRaw'
import NProgress from 'nprogress';

// 约定服务端列表接口至少要返回这一组分页字段，
// hook 才能把响应统一折叠成同一套分页状态。
export interface ResponseType {
    pageNo: number;
    pageSize: number;
    totalPages: number;
    totalSize: number;
}

// 这个 hook 内部固定会追加的分页查询参数。
// 页面侧只需要关心自己的业务筛选项，其余由 hook 统一拼接。
type TableQuery = {
    pageNo: number;
    pageSize: number;
};

// service 是页面传进来的真正请求函数。
// 约束它必须接收“业务参数 + 分页参数”，并返回完整列表响应。
type IService<Response, Params extends Record<string, unknown>> = (
    params: Params & TableQuery
) => Promise<Response>;

// 统一约束列表响应里一定要有 list 字段，
// 这样 dataSource 才能直接根据返回类型自动推导出列表项类型。
interface IResponse<ListItem = unknown> extends ResponseType {
    list: ListItem[];
}

// columns 允许页面把列定义也交给 hook 管理，
// manual 控制是否在组件挂载时自动首屏拉取。
interface IOptions {
    columns?: ColumnType[];
    manual?: boolean;
}

// 通用列表拉取 hook：
// 1. 统一维护 loading / pagination / dataSource
// 2. 自动把分页参数拼到 service 请求里
// 3. 暴露 resetAndLoad / filterColumns 这类列表页常见能力
export default function useFetchTableData<
    Response extends IResponse,
    Params extends Record<string, unknown> = Record<string, never>,
>(service: IService<Response, Params>, options: IOptions = {}) {
    const { columns = [], manual = false } = options;

    // 只提取有 dataIndex 的列，给页面做“显示/隐藏列”之类的配置时直接复用。
    // 这里保留 string[] 而不是整列对象，目的是让上层只关心可筛选字段名。
    const filterKeys = toRaw(columns)
        .filter((item) => typeof item.dataIndex === 'string')
        .map((item) => item.dataIndex as string);

    // defaultColumns 是一份可变列状态。
    // 页面传入的 columns 作为初始值，后续允许通过 filterColumns 动态裁剪。
    const defaultColumns = ref<ColumnType[]>(columns);

    // hook 内部统一维护分页状态，页面只要绑定到 pagination 即可。
    // pageTotal 使用 totalSize 对接组件侧的总条数概念。
    const pagination = reactive<{
        pageNo: number;
        pageSize: number;
        pageTotal: number;
    }>({
        pageNo: 1,
        pageSize: 10,
        pageTotal: 0,
    });

    const dataSource = ref<Response['list']>([] as unknown as Response['list']);
    const loading = ref<boolean>(false);

    // 核心请求方法：
    // - 避免并发重复请求
    // - 统一开启/关闭进度条与 loading
    // - 从 pagination 里读取当前页码
    // - 自动把响应结果写回 dataSource 和 pagination.pageTotal
    const runAsync = async (params: Params = {} as Params): Promise<void> => {
        if (loading.value) return;
        NProgress.start();
        loading.value = true;
        const { pageNo, pageSize } = toRaw(pagination);

        const { list, totalSize } = await service({
            ...allToRaw(params),
            pageNo,
            pageSize,
        }).finally(() => {
            loading.value = false;
            NProgress.done();
        });

        dataSource.value = list;
        pagination.pageTotal = totalSize;
    };

    // 每次切换筛选条件时，通常都需要先回到第一页再重新拉取。
    // 这个方法把“重置页码 + 发请求”打包成一个常用动作。
    const resetAndLoad = (params: Params = {} as Params): void => {
        pagination.pageNo = 1;
        void runAsync(params).catch(() => undefined);
    };

    onBeforeMount(async () => {
        // manual=true 时交由页面自己控制首屏时机，避免某些场景需要先等外部条件准备完。
        if (manual) return;
        await runAsync();
    });

    // 根据传入字段名动态过滤表格列。
    // 不传 keys 时恢复成完整列集合，便于页面做“列显示设置”的还原动作。
    const filterColumns = (keys?: string[]): void => {
        if (!keys) {
            defaultColumns.value = columns;
        } else {
            defaultColumns.value = columns.filter(
                (item) => !item.dataIndex || keys.includes(item.dataIndex),
            );
        }
    };

    // 返回的都是列表页最常见的基础能力，
    // 页面一般只需要把它们直接绑定到表格和搜索动作上即可。
    return {
        loading,
        runAsync,
        pagination,
        dataSource,
        resetAndLoad,
        filterKeys,
        columns: defaultColumns,
        filterColumns,
    };
}
