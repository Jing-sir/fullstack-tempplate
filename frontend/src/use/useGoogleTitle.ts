import { formatText } from '@/utils/common';

export default function useGoogleTitle() {
    const isCode = ref<'ENABLE' | 'DISABLE'>('ENABLE');

    const fetchTitle = computed(() => (isCode.value === 'ENABLE' ? formatText('禁用') : formatText('启用')));

    return {
        isCode,
        fetchTitle,
    };
}
