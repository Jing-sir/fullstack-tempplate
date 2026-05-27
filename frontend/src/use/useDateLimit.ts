import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export default function useDateLimit() {
    const endDate = dayjs().startOf('day').set('hour', 23).set('minute', 59).set('second', 59);
    const startDate = dayjs().subtract(3, 'months').startOf('day');
    const disabledDate = (current: Dayjs) => Boolean(current?.isAfter(dayjs())); // 禁止选择当天之后的时间

    const getDefaultDateRange = () => {
        const startDate = dayjs().subtract(3, 'months').startOf('day');
        const endDate = dayjs().startOf('day').set('hour', 23).set('minute', 59).set('second', 59);
        return [startDate, endDate];
    };

    return {
        endDate,
        startDate,
        disabledDate,
        getDefaultDateRange,
    };
}
