import type { App } from 'vue';
import { THOUSANDS_REGULAR, NUMBER } from '@/utils/constant';

export function dataThousands(value: string) {
    // 数字从右至左添加千分符,逗号隔断,负数、小数、0、不可使用
    const amountArr = String(value).split('.');
    if (NUMBER.test(amountArr[0])) {
        return amountArr.length > 1
            ? `${String(amountArr[0]).replace(THOUSANDS_REGULAR, ',')}.${amountArr[1]}`
            : String(amountArr[0]).replace(THOUSANDS_REGULAR, ',');
    }
    return value;
}

export default {
    install: (app: App): void => {
        const { $filters: filters } = app.config.globalProperties;
        if (import.meta.env.DEV)
            console.warn(
                '过滤器在当前版本已不受支持，查看迁移指南：',
                'https://v3.vuejs.org/guide/migration/filters.html#migration-strategy',
            );
        app.config.globalProperties.$filters = Object.assign(Object.create(null), filters, {
            dataThousands,
        });
    },
};
