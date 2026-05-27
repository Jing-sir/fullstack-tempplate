import type { ComputedRef } from 'vue';
import type { StatusPreset } from '@/enums/statusText';

/**
 * 通用分页结果字段。
 * 多个 api 模块会用到这组字段约束列表接口返回结构。
 * 从 interface/type.ts 迁移至此处统一维护，避免跨目录散落。
 */
export interface Pagination {
    pageNo: number
    pageSize: number
    totalPages: number
    totalSize: number
}

export interface TableCellPresetLabelTagsConfig {
    type: 'labelTags';
    labelListField?: string;
    labelNamesField?: string;
    maxVisible?: number;
    emptyText?: string;
    renderWhen?: {
        field: string;
        values: Array<string | number | boolean>;
    };
    fallbackTextField?: string;
    fallbackTooltipField?: string;
}

export interface TableCellPresetStatusTextConfig {
    type: 'statusText';
    preset: StatusPreset;
    valueField?: string;
    valueFields?: string[];
    fallback?: string;
    showRawWhenUnknown?: boolean;
}

export interface TableCellPresetPercentTextConfig {
    type: 'percentText';
    valueField?: string;
    suffix?: string;
    fallback?: string;
}

export interface TableCellPresetCopyableTextConfig {
    type: 'copyableText';
    valueField?: string;
    copyField?: string;
    fallback?: string;
}

export type TableButtonType = 'primary' | 'secondary' | 'outline' | 'dashed' | 'text';

export type TableButtonStatus = 'normal' | 'success' | 'warning' | 'danger';

export type TableButtonSize = 'mini' | 'small' | 'medium' | 'large';

export interface TableActionConfirmConfig<TRecord = Record<string, unknown>> {
    title?: string;
    content: string | ((record: TRecord) => string);
    okText?: string;
    cancelText?: string;
}

export interface TableActionButtonConfig<TRecord = Record<string, unknown>> {
    buttonKey?: string;
    text: string | ((record: TRecord) => string);
    type?: TableButtonType;
    status?: TableButtonStatus | ((record: TRecord) => TableButtonStatus);
    size?: TableButtonSize;
    hideWhenNoPermission?: boolean;
    show?: boolean | ((record: TRecord) => boolean);
    disabled?: boolean | ((record: TRecord) => boolean);
    loadingField?: string;
    confirm?: TableActionConfirmConfig<TRecord>;
    onClick: (record: TRecord) => void | Promise<void>;
}

export interface TableToolbarButtonConfig {
    buttonKey?: string;
    routeName?: string;
    text: string;
    type?: TableButtonType;
    status?: TableButtonStatus;
    size?: TableButtonSize;
    disabled?: boolean;
    loading?: boolean;
    hideWhenNoPermission?: boolean;
    show?: boolean;
    onClick?: () => void | Promise<void>;
}

export interface TableCellPresetActionButtonsConfig<TRecord = Record<string, unknown>> {
    type: 'actionButtons';
    buttons: TableActionButtonConfig<TRecord>[];
    wrapClass?: string;
    gapClass?: string;
}

export type TableCellPresetConfig =
    | TableCellPresetLabelTagsConfig
    | TableCellPresetStatusTextConfig
    | TableCellPresetPercentTextConfig
    | TableCellPresetCopyableTextConfig
    | TableCellPresetActionButtonsConfig;

export interface TableResultType {
    pageNo: number;
    pageSize: number;
    totalSize: number;
    totalPages: number;
    prevPage: number;
    nextPage: number;
}


export interface ChainRowType {
    id: number; // id
    chainName: string; // 链简称
    slip44: number; // slip44
    txUri: string;
    addressUri: string;
    chainAllName: string; // 链全称
    browser: string; // 区块浏览器
    rollBackState: number; // 回滚状态 1、是 2、否
    depositConfirmNum: number; // 充值确认数
    withdrawConfirmNum: number; // 提币确认数
    lastBlockHeight: number; // 当前高度
    parserBlockHeight: number; // 解析高度
    chainState: number; // 链状态 1、启用 2、禁用
}

export interface TabsType  {
    name: string;
    code: string;
    value?: string;
    role?: string;
}

export type TableSortDirection = 'ascend' | 'descend';

export type TableSortValueType = 'text' | 'number' | 'date' | 'enum';

export type TableSortEnumValue = string | number | boolean;

export interface TableSortFieldConfig<T = Record<string, unknown>> {
    field: string;
    type?: TableSortValueType;
    direction?: TableSortDirection;
    enumOrder?: TableSortEnumValue[];
    emptyPlacement?: 'first' | 'last';
    getValue?: (record: T) => unknown;
}

export interface TableColumnSortConfig<T = Record<string, unknown>>
    extends Omit<TableSortFieldConfig<T>, 'field' | 'direction'> {
    field?: string;
}

export type TableSortField<T = Record<string, unknown>> =
    | string
    | TableSortFieldConfig<T>;

export interface TableSearchSorterConfig<T = Record<string, unknown>> {
    enabled?: boolean;
    fields?: TableSortField<T>[];
}

export interface ColumnType<T = Record<string, unknown>> { // column type
    title: string;
    dataIndex?: string;
    key?: string;
    slotName?: string;
    slots?: {
        customRender: string;
    };
    children?: ColumnType<T>[];
    className?: string;
    align?: string;
    width?: string | number;
    customRender?: (data: { index: number, text: string | number, record: T}) => void;
    fixed?: string;
    ellipsis?: boolean;
    autoEllipsis?: boolean;
    cellPreset?: TableCellPresetConfig;
    sorter?: boolean | TableColumnSortConfig<T>;
    sortable?: {
        sorter?: boolean;
        sortDirections?: TableSortDirection[];
        sortOrder?: TableSortDirection | '';
    };
    /**
     * 是否对单元格值加千分符格式化。
     * - true：强制开启（即使字段名未命中自动检测关键词）
     * - false：强制关闭（跳过自动检测）
     * - 不传：由 TableSearchWrap 根据 dataIndex/title 关键词自动判断
     */
    amountFormat?: boolean;
}

// 搜索字段值类型
export type SearchFieldValue = string | number | null | undefined;

type SearchOptionItem = {
    value: string | null | number;
    label: string;
};

// 搜索选项基础接口
interface BaseSearchOption {
    label: string;
    type: string;
    placeholder?: string;
    sortField?: string;
    sortType?: TableSortValueType;
    sortEnumOrder?: TableSortEnumValue[];
    optionsArr?:
        | SearchOptionItem[]
        | ComputedRef<SearchOptionItem[]>;
    options?:
        | SearchOptionItem[]
        | ComputedRef<SearchOptionItem[]>;
    props?: Record<string, unknown>;
    timeFormat?: string;
}

// 输入框搜索选项
export interface InputSearchOption extends BaseSearchOption {
    type: 'input';
    modelKey: string;
    value?: string | null;
}

// 下拉选择搜索选项
export interface SelectSearchOption extends BaseSearchOption {
    type: 'select';
    modelKey: string;
    value?: string | number | null;
}

// 日期范围搜索选项 - 使用索引签名支持动态属性
export interface DateRangeSearchOption extends BaseSearchOption {
    type: 'date';
    modelKey: string[]; // 两个字段的数组
    [key: string]:
        | SearchFieldValue
        | string[]
        | BaseSearchOption['label']
        | BaseSearchOption['sortField']
        | BaseSearchOption['sortType']
        | BaseSearchOption['sortEnumOrder']
        | BaseSearchOption['optionsArr']
        | BaseSearchOption['props']
        | BaseSearchOption['timeFormat']
        | BaseSearchOption['type'];
}

// 单日期搜索选项
export interface DateSingleSearchOption extends BaseSearchOption {
    type: 'date-single';
    modelKey: string;
    value?: string | null;
}

// 联合类型
export type SearchOption = InputSearchOption | SelectSearchOption | DateRangeSearchOption | DateSingleSearchOption;

// 搜索参数类型
export type SearchParams = Record<string, SearchFieldValue>;

export interface FileItem {
    type: string;
    size: number;
}

export interface TableFetchResult<TRecord = Record<string, unknown>> {
    list: TRecord[];
    pageNo: number;
    pageSize: number;
    totalSize: number;
}

/**
 * TableSearchWrap 请求函数允许的原始返回类型：
 * - 标准分页结构：list/pageNo/pageSize/totalSize
 * - 纯数组：用于后端返回全量列表、不分页的场景
 * - 任意对象：由底层统一做字段兼容折叠（pageNo/pageNum、total/totalSize 等）
 */
export type TableFetchResponse<TRecord = Record<string, unknown>> =
    | TableFetchResult<TRecord>
    | TRecord[]
    | Record<string, unknown>;

export interface TableExportConfig {
    exportApi: (params: Record<string, unknown>) => Promise<Blob>;
    buttonKey?: string;
    buttonText?: string;
    fileName?: string;
    disabled?: boolean;
    buildParams?: (params: Record<string, unknown>) => Record<string, unknown>;
    beforeExport?: (params: Record<string, unknown>) => boolean | Promise<boolean>;
}

export type TableRowKey<TRecord = Record<string, unknown>> =
    | string
    | ((record: TRecord) => string | number);

export interface TableSearchFormExpose {
    reset: () => void;
    search: () => void;
    getSearchParams: () => SearchParams;
}

export interface TableSearchWrapExpose {
    refresh: () => Promise<unknown[]>;
    search: (params?: SearchParams) => Promise<unknown[]>;
    reset: () => void;
    getSearchParams: () => SearchParams;
}

/**
 * 表格滚动配置。
 * x 主要用于横向滚动，y 用于启用并约束纵向滚动。
 */
export interface TableScrollConfig {
    x?: number | string | true;
    y?: number | string;
}

/**
 * 通用表格包装组件 Props。
 * 这里继续保持你当前页面层的调用方式，避免迁移分页实现时影响业务页面。
 */
export interface TableSearchWrapProps {
    searchConf?: SearchOption[];
    isMore?: boolean;
    apiFetch: (params?: Record<string, unknown>) => Promise<TableFetchResponse>;
    tableColumns: ColumnType[];
    exportConfig?: TableExportConfig | null;
    toolbarButtons?: TableToolbarButtonConfig[];
    defaultParams?: SearchParams;
    immediate?: boolean;
    rowKey?: TableRowKey;
    emptyText?: string;
    scroll?: TableScrollConfig;
    tableProps?: Record<string, unknown>;
    showRefresh?: boolean;
    showSkeleton?: boolean;
    skeletonRows?: number;
    searchSorter?: TableSearchSorterConfig;
    enableColumnSort?: boolean;
}
