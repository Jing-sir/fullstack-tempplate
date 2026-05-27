<script setup lang="ts">
import * as echarts from 'echarts/core';
import type { ComposeOption, EChartsType } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
    GridComponent,
    LegendComponent,
    TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type {
    BarSeriesOption,
    LineSeriesOption,
    PieSeriesOption
} from 'echarts/charts';
import type {
    GridComponentOption,
    LegendComponentOption,
    TooltipComponentOption
} from 'echarts/components';
import DashboardChartCard from './DashboardChartCard.vue';

echarts.use([LineChart, BarChart, PieChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

type ECOption = ComposeOption<
    | LineSeriesOption
    | BarSeriesOption
    | PieSeriesOption
    | TooltipComponentOption
    | LegendComponentOption
    | GridComponentOption
>;

interface StatusDataItem {
    name: string;
    value: number;
}

export interface DashboardChartPayload {
    lineAxis: string[];
    incomeSeries: number[];
    payoutSeries: number[];
    settlementSeries: number[];
    statusDistribution: StatusDataItem[];
}

interface Props {
    dataset: DashboardChartPayload;
    windowSize: 7 | 30;
}

const props = defineProps<Props>();
const { t } = useI18n();

const trendEl = useTemplateRef<HTMLElement>('trendChart');
const statusEl = useTemplateRef<HTMLElement>('statusChart');
const settlementEl = useTemplateRef<HTMLElement>('settlementChart');

const trendChart = shallowRef<EChartsType | null>(null);
const statusChart = shallowRef<EChartsType | null>(null);
const settlementChart = shallowRef<EChartsType | null>(null);

const resolveThemePrimaryColor = (): string =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary-6').trim() || '#165DFF';

const createTrendOption = (): ECOption => {
    const primary = resolveThemePrimaryColor();

    return {
        color: [primary, '#0FC6C2'],
        tooltip: {
            trigger: 'axis',
        },
        legend: {
            bottom: 0,
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            textStyle: {
                color: '#86909c',
            },
            data: [t('入账'), t('出账')],
        },
        grid: {
            left: 30,
            right: 20,
            top: 24,
            bottom: 40,
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: props.dataset.lineAxis,
            axisLine: {
                lineStyle: { color: '#e5e6eb' },
            },
            axisLabel: {
                color: '#86909c',
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#86909c',
            },
            splitLine: {
                lineStyle: {
                    color: '#f2f3f5',
                },
            },
        },
        series: [
            {
                name: t('入账'),
                type: 'line',
                smooth: true,
                data: props.dataset.incomeSeries,
                showSymbol: false,
                areaStyle: {
                    opacity: 0.14,
                },
            },
            {
                name: t('出账'),
                type: 'line',
                smooth: true,
                data: props.dataset.payoutSeries,
                showSymbol: false,
            },
        ],
    };
};

const createStatusOption = (): ECOption => {
    const primary = resolveThemePrimaryColor();

    return {
        color: [primary, '#0FC6C2', '#722ED1', '#F53F3F'],
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)',
        },
        legend: {
            orient: 'vertical',
            right: 0,
            top: 'center',
            icon: 'roundRect',
            itemWidth: 10,
            itemHeight: 10,
            textStyle: {
                color: '#86909c',
            },
        },
        series: [
            {
                type: 'pie',
                radius: ['45%', '70%'],
                center: ['34%', '50%'],
                avoidLabelOverlap: false,
                label: {
                    show: false,
                },
                labelLine: {
                    show: false,
                },
                data: props.dataset.statusDistribution,
            },
        ],
    };
};

const createSettlementOption = (): ECOption => {
    const primary = resolveThemePrimaryColor();

    return {
        color: [primary],
        tooltip: {
            trigger: 'axis',
        },
        grid: {
            left: 30,
            right: 20,
            top: 24,
            bottom: 28,
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: props.dataset.lineAxis,
            axisLine: {
                lineStyle: { color: '#e5e6eb' },
            },
            axisLabel: {
                color: '#86909c',
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#86909c',
            },
            splitLine: {
                lineStyle: {
                    color: '#f2f3f5',
                },
            },
        },
        series: [
            {
                name: t('结算量'),
                type: 'bar',
                barMaxWidth: 24,
                data: props.dataset.settlementSeries,
                itemStyle: {
                    borderRadius: [6, 6, 0, 0],
                },
            },
        ],
    };
};

const initCharts = (): void => {
    // 图表实例只在元素存在时初始化，避免 KeepAlive 切换时重复创建。
    if (trendEl.value && !trendChart.value) {
        trendChart.value = echarts.init(trendEl.value);
    }
    if (statusEl.value && !statusChart.value) {
        statusChart.value = echarts.init(statusEl.value);
    }
    if (settlementEl.value && !settlementChart.value) {
        settlementChart.value = echarts.init(settlementEl.value);
    }
};

const applyChartOptions = (): void => {
    trendChart.value?.setOption(createTrendOption(), true);
    statusChart.value?.setOption(createStatusOption(), true);
    settlementChart.value?.setOption(createSettlementOption(), true);
};

const resizeCharts = (): void => {
    trendChart.value?.resize();
    statusChart.value?.resize();
    settlementChart.value?.resize();
};

watch(
    () => props.dataset,
    () => {
        initCharts();
        applyChartOptions();
    },
    { deep: true, immediate: true },
);

onMounted(() => {
    initCharts();
    applyChartOptions();
    window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeCharts);
    trendChart.value?.dispose();
    statusChart.value?.dispose();
    settlementChart.value?.dispose();
    trendChart.value = null;
    statusChart.value = null;
    settlementChart.value = null;
});
</script>

<template>
    <div class="grid gap-4 xl:grid-cols-3">
        <DashboardChartCard
            :title="t('交易趋势')"
            :description="t('观察入账与出账在时间窗口内的波动关系')"
            class="xl:col-span-2"
        >
            <div ref="trendChart" class="h-[300px] w-full" />
        </DashboardChartCard>

        <DashboardChartCard
            :title="t('交易状态分布')"
            :description="t('聚焦成功与待处理占比，辅助判断处理压力')"
        >
            <div ref="statusChart" class="h-[300px] w-full" />
        </DashboardChartCard>

        <DashboardChartCard
            :title="windowSize === 7 ? t('近 7 天结算规模') : t('近 30 天结算规模')"
            :description="t('通过柱状分布快速识别结算峰值区间')"
            class="xl:col-span-3"
        >
            <div ref="settlementChart" class="h-[280px] w-full" />
        </DashboardChartCard>
    </div>
</template>
