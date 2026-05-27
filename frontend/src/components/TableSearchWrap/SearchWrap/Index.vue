<script setup lang="ts">
import { IconCaretDown, IconCaretUp, IconSearch } from '@arco-design/web-vue/es/icon'
import { debounce, map, reduce, toPairs } from 'lodash-es'
import { timeStampToDate } from '@/filters/dateFormat'
import type {
    DateRangeSearchOption,
    DateSingleSearchOption,
    InputSearchOption,
    SearchFieldValue,
    SearchOption,
    SearchParams,
    SelectSearchOption,
    TableSearchFormExpose,
} from '@/interface/TableType'
import type { PropType } from 'vue'
import dayjs from 'dayjs'

const DEBOUNCE_DELAY = 600
const SEARCH_STATE_KEY_PREFIX = 'searchVal'

const props = defineProps({
    searchConf: {
        type: Array as PropType<SearchOption[]>,
        required: true,
        default: () => [],
    },
    isMore: {
        type: Boolean,
        default: true,
    },
})

const { t } = useI18n()
const emits = defineEmits<{
    searchCallback: [params: SearchParams]
}>()
const currentRoute = useRoute()

const formRef = ref()
/**
 * 搜索面板展开状态按“路由作用域”隔离：
 * - 避免一个列表页的默认展开配置污染到其它列表页
 * - 路由缺少 name 时回退 path，保证 key 始终稳定可用
 */
const searchStateStorageKey = computed(() => {
    const routeScope = String(currentRoute.name ?? currentRoute.path ?? 'global')
    return `${SEARCH_STATE_KEY_PREFIX}:${routeScope}`
})

const getStoredSearchExpandState = (): boolean =>
    sessionStorage.getItem(searchStateStorageKey.value) === 'true'

const isSearch = ref(getStoredSearchExpandState())
const isDefaVal = ref(getStoredSearchExpandState())

const getOptionList = (
    item: SearchOption,
): Array<{ value: string | null | number; label: string }> =>
    unref(item.optionsArr ?? item.options ?? [])

const isEmptySelectValue = (value: unknown): boolean =>
    value === '' || value === null || typeof value === 'undefined'

/**
 * Select 组件绑定值归一化：
 * - 空值 => ''（确保界面能命中“全部”选项并展示文案）
 * - 非空值 => 原始值
 */
const normalizeSelectModelValue = (value: unknown): string | number =>
    isEmptySelectValue(value) ? '' : (value as string | number)

/**
 * Select 查询值归一化：
 * - 空值 => null（接口语义仍保持“全部”）
 * - 非空值 => 原始值
 */
const normalizeSelectQueryValue = (value: unknown): string | number | null =>
    isEmptySelectValue(value) ? null : (value as string | number)

/**
 * searchConf 本地副本标准化：
 * 1. 深拷贝，避免直接改父组件传入配置
 * 2. select 默认值统一收敛到 ''，保证默认可见“全部”
 */
const normalizeSearchConf = (searchConf: SearchOption[]): SearchOption[] => {
    const clonedDomains = JSON.parse(JSON.stringify(searchConf)) as SearchOption[]

    clonedDomains.forEach((item) => {
        if (item.type === 'select') {
            const selectItem = item as SelectSearchOption
            selectItem.value = normalizeSelectModelValue(selectItem.value)
        }
    })

    return clonedDomains
}

interface SearchFormState {
    domains: SearchOption[]
}

// 在本地克隆一份配置，避免表单交互直接修改调用方传进来的 searchConf。
const formState = reactive<SearchFormState>({
    domains: normalizeSearchConf(props.searchConf),
})

/**
 * Select 选项统一补齐“全部”：
 * - 页面未提供空值选项时，自动注入一个默认“全部”
 * - 页面已提供空值选项（'' / null）时，保持原配置，避免重复
 */
const getSelectOptionList = (
    item: SearchOption,
): Array<{ value: string | null | number; label: string }> => {
    const optionList = getOptionList(item)

    if (optionList.some((option) => isEmptySelectValue(option.value))) {
        return optionList.map((option) =>
            isEmptySelectValue(option.value)
                ? { ...option, value: '' }
                : option,
        )
    }

    return [{ label: t('全部'), value: '' }, ...optionList]
}

/**
 * Select 选项文案默认按“已就绪文案”直接展示：
 * - 后端返回的 option.label 可能已经完成国际化，不再做二次 t() 包裹
 * - 前端静态文案如需翻译，建议在构造 searchConf 时先完成翻译
 */
const getDisplayOptionList = (
    item: SearchOption,
): Array<{ value: string | null | number; label: string }> =>
    getSelectOptionList(item)

const getFirstModelKey = (): string => {
    const firstInputOption = props.searchConf.find((item) => item.type === 'input')

    if (!firstInputOption) return ''

    return typeof firstInputOption.modelKey === 'string'
        ? firstInputOption.modelKey
        : firstInputOption.modelKey[0] || ''
}

const searchState = ref<{ searchKey: string; searchVal: string }>({
    searchKey: getFirstModelKey(),
    searchVal: '',
})

// 将日期控件的值统一整理成接口可直接使用的字符串或时间戳。
const getNormalizedDateValue = (value: SearchFieldValue, timeFormat?: string): SearchFieldValue => {
    if (value === '' || value === null || typeof value === 'undefined') {
        return null
    }

    if (timeFormat === 'timeStamp') {
        return String(dayjs(value).valueOf())
    }

    return timeStampToDate(String(value), timeFormat || 'YYYY-MM-DD HH:mm:ss')
}

const emitSearch = (): void => {
    emits('searchCallback', { ...getSearchCal.value })
}

// 顶部快捷搜索使用防抖，避免每次输入都立即触发请求。
const onSearch = debounce((): void => {
    emitSearch()
}, DEBOUNCE_DELAY)

// 清空输入框时立即触发查询，并取消已有防抖队列，避免重复请求。
const onInputClear = (): void => {
    onSearch.cancel()
    emitSearch()
}

const onToggleSearch = (): void => {
    isSearch.value = !isSearch.value
}

const onChangeCheck = (): void => {
    isSearch.value = isDefaVal.value
    sessionStorage.setItem(searchStateStorageKey.value, String(isDefaVal.value))
}

const onReset = (): void => {
    formRef.value?.resetFields()
    formState.domains.forEach((item: SearchOption) => {
        if (item.type === 'input') {
            ;(item as InputSearchOption).value = ''
            return
        }

        if (item.type === 'select') {
            ;(item as SelectSearchOption).value = ''
            return
        }

        if (item.type === 'date-single') {
            ;(item as DateSingleSearchOption).value = null
            return
        }

        if (item.type === 'date') {
            ;(item as DateRangeSearchOption).modelKey.forEach((key: string) => {
                ;(item as DateRangeSearchOption)[key] = ''
            })
        }
    })

    searchState.value = {
        searchKey: getFirstModelKey(),
        searchVal: '',
    }
    emitSearch()
}

/**
 * Select 值变化时，空值统一回写为 ''，保证“全部”文案可见。
 */
const onSelectChange = (item: SearchOption, value: unknown): void => {
    if (item.type !== 'select') {
        emitSearch()
        return
    }

    const selectItem = item as SelectSearchOption
    selectItem.value = normalizeSelectModelValue(value)
    emitSearch()
}

// 将顶部快捷搜索和下方高级筛选合并成最终接口查询参数。
const getSearchCal = computed((): SearchParams => {
    const obj = reduce(
        getFormStateObj.value,
        (acc: SearchParams, item: SearchParams) => {
            const [key, value] = toPairs(item)[0]
            acc[key] = value
            return acc
        },
        {} as SearchParams,
    )

    if (!searchState.value.searchKey) {
        return obj
    }

    return {
        ...obj,
        [searchState.value.searchKey]: searchState.value.searchVal || null,
    }
})

// 按字段类型把 searchConf 中的每一项转换成最终接口参数结构。
const getFormStateObj = computed((): SearchParams[] =>
    map(formState.domains, (item: SearchOption): SearchParams => {
        if (item.type === 'input') {
            const inputItem = item as InputSearchOption
            return {
                [inputItem.modelKey]: inputItem.value || null,
            }
        }

        if (item.type === 'select') {
            const selectItem = item as SelectSearchOption
            return {
                [selectItem.modelKey]: normalizeSelectQueryValue(selectItem.value),
            }
        }

        if (item.type === 'date-single') {
            const dateSingleItem = item as DateSingleSearchOption
            return {
                [dateSingleItem.modelKey]: getNormalizedDateValue(
                    dateSingleItem.value ?? null,
                    dateSingleItem.timeFormat,
                ),
            }
        }

        const dateItem = item as DateRangeSearchOption
        return reduce(
            dateItem.modelKey,
            (acc: SearchParams, childKey: string) => {
                const value = dateItem[childKey] as SearchFieldValue
                acc[childKey] = getNormalizedDateValue(value, dateItem.timeFormat)
                return acc
            },
            {} as SearchParams,
        )
    }),
)

const getSearchOptions = computed(() => props.searchConf.filter((item) => item.type === 'input'))
const hasQuickSearch = computed(() => getSearchOptions.value.length > 0)

// 顶部快捷搜索已经占用的字段，在高级筛选区里隐藏，避免重复渲染。
const getConfArr = computed(() =>
    formState.domains.filter((item: SearchOption) => {
        const key = typeof item.modelKey === 'string' ? item.modelKey : item.modelKey[0]
        return !hasQuickSearch.value || key !== searchState.value.searchKey
    }),
)

const fetchTipsText = computed(
    () =>
        getSearchOptions.value.find((item) => item.modelKey === searchState.value.searchKey)
            ?.label || '',
)

watch(
    () => searchStateStorageKey.value,
    () => {
        const nextExpandState = getStoredSearchExpandState()
        isSearch.value = nextExpandState
        isDefaVal.value = nextExpandState
    },
)

/**
 * 监听 searchConf 变化，用于响应语言切换、动态选项更新等场景。
 *
 * 只同步元数据字段（label / placeholder / options / optionsArr / props），
 * 不覆盖用户已填写的 value，避免 keep-alive 场景下切回页面时搜索条件被清空。
 *
 * 背景：searchConf 是页面侧的 computed，语言切换时会产生新对象，
 * 但 value 始终是初始空值；如果直接整体替换 formState.domains，
 * 用户已输入的筛选条件会被抹掉。
 */
watch(
    () => props.searchConf,
    (value) => {
        // 遍历最新配置，只把元数据补丁到现有 domain 上，value 保持不动。
        value.forEach((newItem) => {
            const newKey = Array.isArray(newItem.modelKey)
                ? newItem.modelKey[0]
                : newItem.modelKey

            const existing = formState.domains.find((d) => {
                const dKey = Array.isArray(d.modelKey) ? d.modelKey[0] : d.modelKey
                return dKey === newKey
            })

            if (existing) {
                // 只更新展示相关的元数据，不碰 value
                existing.label = newItem.label
                if ('placeholder' in newItem) {
                    ;(existing as InputSearchOption).placeholder = (
                        newItem as InputSearchOption
                    ).placeholder
                }
                if ('options' in newItem) {
                    ;(existing as SelectSearchOption).options = (
                        newItem as SelectSearchOption
                    ).options
                }
                if ('optionsArr' in newItem) {
                    ;(existing as SelectSearchOption).optionsArr = (
                        newItem as SelectSearchOption
                    ).optionsArr
                }
                if ('props' in newItem) {
                    existing.props = newItem.props
                }
            } else {
                // 新增的字段直接追加（带 value 初始化）
                formState.domains.push(
                    ...normalizeSearchConf([newItem]) as typeof formState.domains,
                )
            }
        })

        // 移除已从 searchConf 中删除的字段
        formState.domains = formState.domains.filter((d) => {
            const dKey = Array.isArray(d.modelKey) ? d.modelKey[0] : d.modelKey
            return value.some((item) => {
                const itemKey = Array.isArray(item.modelKey) ? item.modelKey[0] : item.modelKey
                return itemKey === dKey
            })
        }) as typeof formState.domains

        if (!getSearchOptions.value.find((item) => item.modelKey === searchState.value.searchKey)) {
            searchState.value.searchKey = getFirstModelKey()
        }
    },
    { deep: true },
)

// 对外暴露基础表单操作，供 TableSearchWrap 父组件复用当前搜索状态。
defineExpose<TableSearchFormExpose>({
    reset: onReset,
    search: emitSearch,
    getSearchParams: (): SearchParams => ({ ...getSearchCal.value }),
})
</script>
<template>
    <div class="w-full">
        <header class="w-full">
            <div class="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div
                    v-if="hasQuickSearch"
                    class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:max-w-[48rem]"
                >
                    <a-select
                        v-model="searchState.searchKey"
                        class="min-w-[160px] sm:w-[180px]"
                        size="small"
                        @change="emitSearch"
                    >
                        <a-option
                            v-for="item of getSearchOptions"
                            :key="item.modelKey"
                            :value="item.modelKey"
                        >
                            {{ item.label }}
                        </a-option>
                    </a-select>
                    <a-input
                        v-model="searchState.searchVal"
                        allow-clear
                        size="small"
                        class="w-2/5"
                        :placeholder="t('搜索{label}', { label: fetchTipsText })"
                        @pressEnter="emitSearch"
                        @input="onSearch"
                        @clear="onInputClear"
                    >
                        <template #prefix>
                            <IconSearch class="search-icon" />
                        </template>
                    </a-input>
                </div>
                <div v-else>
                    <slot name="left"></slot>
                </div>
                <a-space
                    v-if="props.isMore && props.searchConf.length > 1"
                    class="justify-end"
                    wrap
                >
                    <a-checkbox v-model="isDefaVal" :value="false" @change="onChangeCheck">
                        {{ t('默认展开') }}
                    </a-checkbox>
                    <a-button size="small" @click.stop="onToggleSearch">
                        <template #icon>
                            <span class="mr-1">
                                <IconCaretDown v-if="!isSearch" />
                                <IconCaretUp v-else />
                            </span>
                        </template>
                        {{ t('更多筛选') }}
                    </a-button>
                </a-space>
            </div>
        </header>
        <div
            v-if="isSearch && props.searchConf.length > 1"
            :class="[
                'mt-[10px] flex flex-col rounded-[10px] bg-[var(--app-search-panel-bg)] animate__animated',
                isSearch ? 'animate__fadeIn' : 'animate__fadeOut',
                'animate__delay-0.6s',
            ]"
        >
            <a-form ref="formRef" size="small" :model="formState" layout="vertical">
                <div class="w-full px-3 pt-3">
                    <a-row :gutter="[12, 0]">
                        <a-col
                            v-for="(item, i) of getConfArr"
                            :key="i"
                            :span="['input', 'select', 'date-single'].includes(item.type) ? 4 : 8"
                        >
                            <a-form-item :label="item.label" :name="item.modelKey">
                                <a-input
                                    v-if="item.type === 'input'"
                                    v-model="item.value"
                                    class="w-full"
                                    :placeholder="
                                        t(item.placeholder || '请输入{label}', {
                                            label: item.label,
                                        })
                                    "
                                    v-bind="item.props"
                                    @pressEnter="emitSearch"
                                    @input="onSearch"
                                    @clear="onInputClear"
                                />
                                <a-select
                                    v-if="item.type === 'select'"
                                    v-model="item.value"
                                    :options="getDisplayOptionList(item)"
                                    allow-search
                                    :placeholder="
                                        t(item.placeholder || '请选择{label}', {
                                            label: item.label,
                                        })
                                    "
                                    v-bind="item.props"
                                    @change="(value: unknown) => onSelectChange(item, value)"
                                />
                                <a-date-picker
                                    v-if="item.type === 'date-single'"
                                    v-model="item.value"
                                    class="w-full"
                                    show-time
                                    format="YYYY-MM-DD HH:mm:ss"
                                    v-bind="item.props"
                                    @change="emitSearch"
                                />
                                <template v-if="item.type === 'date' && item.modelKey.length">
                                    <div class="flex flex-row items-center w-full">
                                        <template
                                            v-for="(child, childI) of item.modelKey"
                                            :key="childI"
                                        >
                                            <a-date-picker
                                                v-model="item[child]"
                                                class="w-full"
                                                show-time
                                                format="YYYY-MM-DD HH:mm:ss"
                                                v-bind="item.props"
                                                @change="emitSearch"
                                            />
                                            <span v-if="childI === 0" class="mx-2">~</span>
                                        </template>
                                    </div>
                                </template>
                            </a-form-item>
                        </a-col>
                    </a-row>
                </div>
            </a-form>
            <div
                class="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--app-divider)] bg-transparent px-3 pt-[10px] pb-3"
            >
                <div class="flex flex-wrap items-center gap-2">
                    <slot name="footerActions" />
                    <a-button type="primary" size="small" @click.stop="emitSearch">
                        {{ t('搜索') }}
                    </a-button>
                    <a-button size="small" @click.stop="onReset">
                        {{ t('重置') }}
                    </a-button>
                </div>
            </div>
        </div>
    </div>
</template>
