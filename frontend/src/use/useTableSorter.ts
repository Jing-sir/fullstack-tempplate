import dayjs from 'dayjs';
import { get } from 'lodash-es';
import { computed, shallowRef, unref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type {
    ColumnType,
    SearchOption,
    SearchParams,
    TableColumnSortConfig,
    TableSearchSorterConfig,
    TableSortDirection,
    TableSortField,
    TableSortFieldConfig,
    TableSortValueType,
} from '@/interface/TableType';

const TEXT_COLLATOR = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
});

type ActiveColumnSorter = {
    columnKey: string;
    direction: TableSortDirection;
};

type NormalizedSortRule<TRecord = Record<string, unknown>> = TableSortFieldConfig<TRecord> & {
    direction: TableSortDirection;
    emptyPlacement: 'first' | 'last';
};

interface UseTableSorterOptions<TRecord = Record<string, unknown>> {
    columns: ComputedRef<ColumnType<TRecord>[]> | Ref<ColumnType<TRecord>[]>;
    rawDataSource: ComputedRef<TRecord[]>;
    searchConf: ComputedRef<SearchOption[]> | Ref<SearchOption[]>;
    currentSearchParams: Ref<SearchParams>;
    searchSorter?:
        | ComputedRef<TableSearchSorterConfig<TRecord> | undefined>
        | Ref<TableSearchSorterConfig<TRecord> | undefined>;
    enableColumnSort?: boolean;
}

/**
 * 只把真正“有值”的搜索条件视为激活状态。
 * 这样像空字符串、null、undefined 不会错误触发搜索字段排序。
 */
const hasEffectiveValue = (value: unknown): boolean =>
    !(value === '' || value === null || typeof value === 'undefined');

/**
 * 文本列默认走自然排序，兼容中文、数字串和大小写混合内容。
 */
const compareText = (left: unknown, right: unknown): number =>
    TEXT_COLLATOR.compare(String(left ?? ''), String(right ?? ''));

/**
 * 数值列统一转成 Number 比较。
 * 如果格式异常，则退回文本比较，避免出现 NaN 直接把排序打乱。
 */
const compareNumber = (left: unknown, right: unknown): number => {
    const leftNumber = Number(left);
    const rightNumber = Number(right);

    if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
        return compareText(left, right);
    }

    if (leftNumber === rightNumber) {
        return 0;
    }

    return leftNumber > rightNumber ? 1 : -1;
};

/**
 * 时间列统一转成时间戳比较。
 * 这里兼容 Date、dayjs 可识别字符串、以及数字时间戳。
 */
const compareDate = (left: unknown, right: unknown): number => {
    const leftTime = dayjs(left as string | number | Date | null | undefined).valueOf();
    const rightTime = dayjs(right as string | number | Date | null | undefined).valueOf();

    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return compareText(left, right);
    }

    if (leftTime === rightTime) {
        return 0;
    }

    return leftTime > rightTime ? 1 : -1;
};

/**
 * 枚举列优先按业务声明的顺序排序。
 * 如果调用方没有提供枚举顺序，则回退到文本比较，保证仍然可排序。
 */
const compareEnum = <TRecord>(
    left: unknown,
    right: unknown,
    rule: NormalizedSortRule<TRecord>,
): number => {
    if (!rule.enumOrder?.length) {
        return compareText(left, right);
    }

    const enumRankMap = new Map(
        rule.enumOrder.map((value, index) => [String(value), index]),
    );
    const leftRank = enumRankMap.get(String(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = enumRankMap.get(String(right)) ?? Number.MAX_SAFE_INTEGER;

    if (leftRank === rightRank) {
        return compareText(left, right);
    }

    return leftRank > rightRank ? 1 : -1;
};

/**
 * 在没有显式指定类型时，按值特征推断排序方式：
 * - number / 数字字符串 -> number
 * - 可识别时间 -> date
 * - 其余默认 text
 */
const getSortType = <TRecord>(
    left: unknown,
    right: unknown,
    rule: NormalizedSortRule<TRecord>,
): TableSortValueType => {
    if (rule.type) {
        return rule.type;
    }

    if (rule.enumOrder?.length) {
        return 'enum';
    }

    const sample = hasEffectiveValue(left) ? left : right;

    if (typeof sample === 'boolean') {
        return 'enum';
    }

    if (typeof sample === 'number') {
        return 'number';
    }

    if (
        typeof sample === 'string' &&
        sample.trim() &&
        !Number.isNaN(Number(sample))
    ) {
        return 'number';
    }

    if (
        (sample instanceof Date || typeof sample === 'string') &&
        dayjs(sample as string | Date).isValid()
    ) {
        return 'date';
    }

    return 'text';
};

/**
 * 统一把排序规则收口成一套结构，避免页面层和组件层重复兜底逻辑。
 */
const normalizeSortRule = <TRecord>(
    field: TableSortField<TRecord>,
    fallback: Partial<NormalizedSortRule<TRecord>> = {},
): NormalizedSortRule<TRecord> => {
    const normalizedField = typeof field === 'string' ? { field } : field;

    return {
        emptyPlacement: fallback.emptyPlacement ?? 'last',
        direction: fallback.direction ?? 'ascend',
        ...fallback,
        ...normalizedField,
    } as NormalizedSortRule<TRecord>;
};

/**
 * select 搜索项天然带有一套枚举顺序配置，
 * 直接复用 options 顺序，能让搜索字段排序在状态类场景里更符合业务预期。
 */
const getSearchOptionEnumOrder = (option: SearchOption): Array<string | number | boolean> | undefined => {
    if (option.type !== 'select') {
        return option.sortEnumOrder;
    }

    const optionList = unref(option.optionsArr ?? option.options ?? []);
    const derivedEnumOrder = optionList
        .map((item) => item.value)
        .filter(
            (value): value is string | number =>
                typeof value === 'string' ||
                typeof value === 'number',
        );

    return option.sortEnumOrder ?? (derivedEnumOrder.length ? derivedEnumOrder : undefined);
};

/**
 * 依据搜索项配置把“当前激活的搜索条件”转换成排序规则：
 * - 优先使用搜索项显式声明的 sortField / sortType / sortEnumOrder
 * - 没有声明时退回当前参数 key 本身
 */
const getSearchSortRuleFromOption = <TRecord>(
    option: SearchOption,
    key: string,
): NormalizedSortRule<TRecord> =>
    normalizeSortRule<TRecord>(
        {
            field: option.sortField ?? key,
            type:
                option.sortType ??
                (option.type === 'date' || option.type === 'date-single'
                    ? 'date'
                    : undefined),
            enumOrder: getSearchOptionEnumOrder(option),
        },
        {
            direction: 'ascend',
            emptyPlacement: 'last',
        },
    );

/**
 * 递归按 dataIndex 查找列配置，供“当前列排序”回溯原始列元数据使用。
 */
const findColumnByDataIndex = <TRecord>(
    columns: ColumnType<TRecord>[],
    dataIndex: string,
): ColumnType<TRecord> | null => {
    for (const column of columns) {
        if (column.dataIndex === dataIndex) {
            return column;
        }

        if (column.children?.length) {
            const target = findColumnByDataIndex(column.children, dataIndex);

            if (target) {
                return target;
            }
        }
    }

    return null;
};

/**
 * 当前列排序只需要页面关心“是否开启”和“字段类型/枚举顺序”等元数据。
 * 方向由表头点击行为驱动，不放在页面静态配置里。
 */
const buildColumnSortRule = <TRecord>(
    column: ColumnType<TRecord>,
    enableColumnSort: boolean,
): NormalizedSortRule<TRecord> | null => {
    if (!enableColumnSort || !column.dataIndex || column.sorter === false) {
        return null;
    }

    const columnSorter =
        typeof column.sorter === 'object'
            ? (column.sorter as TableColumnSortConfig<TRecord>)
            : {};

    return normalizeSortRule<TRecord>(
        {
            field: columnSorter.field ?? column.dataIndex,
            type: columnSorter.type,
            enumOrder: columnSorter.enumOrder,
            emptyPlacement: columnSorter.emptyPlacement,
            getValue: columnSorter.getValue,
        },
        {
            direction: 'ascend',
            emptyPlacement: 'last',
        },
    );
};

/**
 * 支持通过 dataIndex 路径读取值。
 * 这样像 `a.b.c` 这类嵌套字段也能复用同一套排序逻辑。
 */
const getRecordValue = <TRecord>(
    record: TRecord,
    rule: NormalizedSortRule<TRecord>,
): unknown => {
    if (rule.getValue) {
        return rule.getValue(record);
    }

    return get(record, rule.field);
};

/**
 * 所有排序最终都走这一层比较器：
 * 1. 统一处理空值位置
 * 2. 按类型选择对应比较规则
 * 3. 最后按方向翻转结果
 */
const compareRecordByRule = <TRecord>(
    leftRecord: TRecord,
    rightRecord: TRecord,
    rule: NormalizedSortRule<TRecord>,
): number => {
    const leftValue = getRecordValue(leftRecord, rule);
    const rightValue = getRecordValue(rightRecord, rule);
    const leftEmpty = !hasEffectiveValue(leftValue);
    const rightEmpty = !hasEffectiveValue(rightValue);

    if (leftEmpty && rightEmpty) {
        return 0;
    }

    if (leftEmpty || rightEmpty) {
        const emptyResult = rule.emptyPlacement === 'first' ? -1 : 1;
        return leftEmpty ? emptyResult : -emptyResult;
    }

    const sortType = getSortType(leftValue, rightValue, rule);
    const compareResult =
        sortType === 'number'
            ? compareNumber(leftValue, rightValue)
            : sortType === 'date'
                ? compareDate(leftValue, rightValue)
                : sortType === 'enum'
                    ? compareEnum(leftValue, rightValue, rule)
                    : compareText(leftValue, rightValue);

    return rule.direction === 'descend' ? -compareResult : compareResult;
};

export default function useTableSorter<TRecord = Record<string, unknown>>(
    options: UseTableSorterOptions<TRecord>,
) {
    const {
        columns,
        rawDataSource,
        searchConf,
        currentSearchParams,
        searchSorter,
        enableColumnSort = true,
    } = options;

    /**
     * 当前激活的列排序状态。
     * 这里只记录“是哪个表头触发的排序”和“当前方向”，其余规则回到列配置里取。
     */
    const activeColumnSorter = shallowRef<ActiveColumnSorter | null>(null);

    /**
     * 搜索字段排序规则：
     * - 启用后，如果外部传了 fields，则直接按 fields 顺序排序
     * - 否则只根据当前有值的搜索项，按 searchConf 原顺序生成排序规则
     */
    const searchSortRules = computed(() => {
        const sorterConfig = searchSorter?.value;

        if (!sorterConfig?.enabled) {
            return [];
        }

        if (sorterConfig.fields?.length) {
            return sorterConfig.fields.map((field) =>
                normalizeSortRule<TRecord>(field, {
                    direction: 'ascend',
                    emptyPlacement: 'last',
                }),
            );
        }

        return searchConf.value
            .filter((option) => {
                const modelKeys =
                    typeof option.modelKey === 'string'
                        ? [option.modelKey]
                        : option.modelKey;

                return modelKeys.some((key) => hasEffectiveValue(currentSearchParams.value[key]));
            })
            .map((option) => {
                const modelKeys =
                    typeof option.modelKey === 'string'
                        ? [option.modelKey]
                        : option.modelKey;
                const activeKey =
                    modelKeys.find((key) => hasEffectiveValue(currentSearchParams.value[key])) ??
                    modelKeys[0];

                return getSearchSortRuleFromOption<TRecord>(option, activeKey);
            });
    });

    /**
     * 当前列排序的最终规则。
     * 表头只负责产生方向，真正排序字段、类型和枚举顺序仍以页面列配置为准。
     */
    const activeColumnSortRule = computed(() => {
        const currentColumnSorter = activeColumnSorter.value;

        if (!currentColumnSorter) {
            return null;
        }

        const sourceColumn = findColumnByDataIndex(
            columns.value,
            currentColumnSorter.columnKey,
        );

        if (!sourceColumn) {
            return null;
        }

        const columnSortRule = buildColumnSortRule(sourceColumn, enableColumnSort);

        if (!columnSortRule) {
            return null;
        }

        return {
            ...columnSortRule,
            direction: currentColumnSorter.direction,
        };
    });

    /**
     * 对列配置做统一补齐：
     * 1. 自动补 key
     * 2. 给允许排序的列挂上 Arco 的 sortable 元信息
     * 3. 递归处理 children，保证分组列表头也能复用同一套逻辑
     */
    const normalizeColumns = (
        sourceColumns: ColumnType<TRecord>[],
    ): ColumnType<TRecord>[] =>
        sourceColumns.map((column) => {
            const columnSortRule = buildColumnSortRule(column, enableColumnSort);
            const currentSortOrder =
                activeColumnSorter.value?.columnKey === column.dataIndex
                    ? activeColumnSorter.value?.direction ?? ''
                    : '';

            return {
                ...column,
                key: column.key ?? column.dataIndex ?? String(column.title),
                sortable: columnSortRule
                    ? {
                        sorter: true,
                        sortDirections: ['ascend', 'descend'],
                        sortOrder: currentSortOrder,
                    }
                    : undefined,
                children: column.children
                    ? normalizeColumns(column.children)
                    : undefined,
            };
        });

    /**
     * 实际排序管线：
     * - 当前列排序优先级最高，因为它是用户刚刚点击表头产生的显式意图
     * - 搜索字段排序作为二级规则，负责在相同列值下进一步稳定排序
     * - 最后追加原始索引兜底，保证排序稳定，不会打乱接口原顺序
     */
    const sortRecords = (records: TRecord[]): TRecord[] => {
        const sortRules = [
            activeColumnSortRule.value,
            ...searchSortRules.value,
        ].filter(Boolean) as NormalizedSortRule<TRecord>[];

        if (!sortRules.length) {
            return records;
        }

        return records
            .map((record, index) => ({ record, index }))
            .sort((left, right) => {
                for (const rule of sortRules) {
                    const compareResult = compareRecordByRule(
                        left.record,
                        right.record,
                        rule,
                    );

                    if (compareResult !== 0) {
                        return compareResult;
                    }
                }

                return left.index - right.index;
            })
            .map((item) => item.record);
    };

    /**
     * 表格最终渲染数据。
     * 这里把排序放在 computed 里，确保分页切换、刷新、搜索结果变化时都能自动联动。
     */
    const sortedDataSource = computed(() => sortRecords(rawDataSource.value));

    /**
     * 表头点击时只更新当前列排序状态，数据本身由 computed 统一派生。
     */
    const onSorterChange = (
        dataIndex: string,
        direction: TableSortDirection | '',
    ): void => {
        activeColumnSorter.value = direction
            ? {
                columnKey: dataIndex,
                direction,
            }
            : null;
    };

    return {
        normalizedColumns: computed(() => normalizeColumns(columns.value)),
        onSorterChange,
        sortedDataSource,
        sortRecords,
    };
}
