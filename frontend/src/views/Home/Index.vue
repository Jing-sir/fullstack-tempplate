<script setup lang="ts">
import { timeStampToDate } from '@/filters/dateFormat';
import type { DashboardChartPayload } from './components/HomeEchartsPanel.vue';

type WindowSize = 7 | 30;

interface SummaryCard {
    title: string;
    value: string;
    hint: string;
    trend: 'up' | 'down' | 'flat';
}

const { t } = useI18n();
const HomeEchartsPanel = defineAsyncComponent(() => import('./components/HomeEchartsPanel.vue'));

const activeWindow = shallowRef<WindowSize>(7);
const refreshSeed = shallowRef<number>(Date.now());
const lastRefreshTime = shallowRef<string>(timeStampToDate(Date.now(), 'YYYY-MM-DD HH:mm:ss'));

const buildLineAxis = (windowSize: WindowSize): string[] => {
    // 近 7 天使用固定星期标签，近 30 天使用日期标签，便于视觉快速识别。
    if (windowSize === 7) {
        return [t('周一'), t('周二'), t('周三'), t('周四'), t('周五'), t('周六'), t('周日')];
    }

    return Array.from({ length: 10 }, (_, index) => t('第 {index} 周', { index: index + 1 }));
};

const baseAmountByWindow: Record<WindowSize, number[]> = {
    7: [88, 101, 126, 118, 133, 151, 146],
    30: [452, 466, 479, 493, 488, 507, 520, 538, 552, 566],
};

const applySeedNoise = (seed: number, source: number[], range: number): number[] =>
    source.map((value, index) => {
        // 基于 seed 生成稳定抖动，保证“刷新看板”有变化但幅度可控。
        const offset = Math.round(Math.sin(seed / 1000 + index * 1.57) * range);
        return Math.max(0, value + offset);
    });

const dashboardDataset = computed<DashboardChartPayload>(() => {
    const income = applySeedNoise(refreshSeed.value, baseAmountByWindow[activeWindow.value], activeWindow.value === 7 ? 6 : 15);
    const payout = income.map((value, index) => Math.max(0, value - 9 - index));
    const settlement = income.map((value, index) => Math.max(0, value - 15 + (index % 3)));
    const successfulCount = settlement.reduce((acc, value) => acc + value, 0);
    const pendingCount = Math.round(successfulCount * 0.08);
    const reviewingCount = Math.round(successfulCount * 0.06);
    const failedCount = Math.round(successfulCount * 0.02);

    return {
        lineAxis: buildLineAxis(activeWindow.value),
        incomeSeries: income,
        payoutSeries: payout,
        settlementSeries: settlement,
        statusDistribution: [
            { name: t('成功'), value: successfulCount },
            { name: t('待处理'), value: pendingCount },
            { name: t('待确认'), value: reviewingCount },
            { name: t('失败'), value: failedCount },
        ],
    };
});

const summaryCards = computed<SummaryCard[]>(() => {
    const totalVolume = dashboardDataset.value.incomeSeries.reduce((acc, value) => acc + value, 0);
    const successPart = dashboardDataset.value.statusDistribution.find((item) => item.name === t('成功'))?.value ?? 0;
    const totalStatus = dashboardDataset.value.statusDistribution.reduce((acc, item) => acc + item.value, 0);
    const pendingPart = dashboardDataset.value.statusDistribution
        .filter((item) => [t('待处理'), t('待确认')].includes(item.name))
        .reduce((acc, item) => acc + item.value, 0);
    const successRate = totalStatus ? (successPart / totalStatus) * 100 : 0;
    const activeAccounts = Math.round(totalVolume * 2.4);

    return [
        {
            title: t('总交易额'),
            value: `${totalVolume.toLocaleString()} USDT`,
            hint: t('较上一周期增长 8.4%'),
            trend: 'up',
        },
        {
            title: t('交易成功率'),
            value: `${successRate.toFixed(1)}%`,
            hint: t('失败率保持在可控范围内'),
            trend: 'up',
        },
        {
            title: t('待处理工单'),
            value: pendingPart.toLocaleString(),
            hint: t('较昨日下降 3.2%'),
            trend: 'down',
        },
        {
            title: t('活跃账户'),
            value: activeAccounts.toLocaleString(),
            hint: t('近一周保持平稳增长'),
            trend: 'flat',
        },
    ];
});

const setWindow = (windowSize: WindowSize): void => {
    if (activeWindow.value === windowSize) return;
    activeWindow.value = windowSize;
};

const refreshDashboard = (): void => {
    refreshSeed.value = Date.now();
    lastRefreshTime.value = timeStampToDate(Date.now(), 'YYYY-MM-DD HH:mm:ss');
};
</script>

<template>
    <section class="flex flex-col gap-4">
        <!-- 首页看板头部：提供时间范围切换和手动刷新能力。 -->
        <div class="rounded-[var(--app-pane-radius)] border border-[var(--app-divider)] bg-[var(--app-surface)] p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-[var(--app-text)]">
                        {{ t('业务总览看板') }}
                    </h2>
                    <p class="mt-1 text-sm text-[var(--app-text-muted)]">
                        {{ t('聚合交易规模、结算表现与状态分布，帮助快速定位运营波动') }}
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <a-button
                        :type="activeWindow === 7 ? 'primary' : 'outline'"
                        size="small"
                        @click="setWindow(7)"
                    >
                        {{ t('近 7 天') }}
                    </a-button>
                    <a-button
                        :type="activeWindow === 30 ? 'primary' : 'outline'"
                        size="small"
                        @click="setWindow(30)"
                    >
                        {{ t('近 30 天') }}
                    </a-button>
                    <a-button size="small" @click="refreshDashboard">
                        {{ t('刷新看板') }}
                    </a-button>
                </div>
            </div>
            <p class="mt-2 text-xs text-[var(--app-text-muted)]">
                {{ t('最近更新：{time}', { time: lastRefreshTime }) }}
            </p>
        </div>

        <!-- 关键指标卡片：让运营侧先看核心结论，再进入图表细节。 -->
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article
                v-for="card in summaryCards"
                :key="card.title"
                class="rounded-[var(--app-pane-radius)] border border-[var(--app-divider)] bg-[var(--app-surface)] p-4"
            >
                <p class="text-sm text-[var(--app-text-muted)]">{{ card.title }}</p>
                <p class="mt-2 text-2xl font-semibold text-[var(--app-text)]">{{ card.value }}</p>
                <p
                    class="mt-2 text-xs"
                    :class="{
                        'text-emerald-600': card.trend === 'up',
                        'text-amber-600': card.trend === 'flat',
                        'text-rose-600': card.trend === 'down',
                    }"
                >
                    {{ card.hint }}
                </p>
            </article>
        </div>

        <!-- 图表区域：由独立组件托管 ECharts 生命周期。 -->
        <HomeEchartsPanel :dataset="dashboardDataset" :window-size="activeWindow" />
    </section>
</template>
