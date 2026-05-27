import { formatText } from '@/utils/common';

type IOptions = {
    beforeOk?: () => Promise<void> | void
    afterCancel?: () => Promise<void> | void
    beforeCancel?: () => Promise<void> | void
    title?: string,
    getContainer?: () => HTMLElement | undefined,
    defaultOpen?:boolean
}

const noop = () => {};
const defaultGetContainer = () => document.body;
export default function useModalHandler(options: IOptions = {}) {
    const { beforeOk = noop, afterCancel = noop, beforeCancel = noop, title = '信息', getContainer = defaultGetContainer, defaultOpen = false } = options;
    const modalTitle = ref<string>(formatText(title));
    const open = ref<boolean>(defaultOpen);
    const onCancel = async () => {
        await beforeCancel();
        open.value = false;
        await afterCancel();
    };
    return {
        open,
        onOk: async () => {
            await beforeOk();
            await onCancel();
        },
        onCancel,
        openModal: (title?:string) => {
            modalTitle.value = formatText(title || '信息');
            open.value = true;
        },
        title: modalTitle,
        getContainer: () => {
            const el = getContainer();
            if (el) return el;
            return document.body;
        }
    };
}
