import { Modal } from '@arco-design/web-vue'

interface ConfirmActionOptions {
    title?: string
    content: string
    okText?: string
    cancelText?: string
    onOk: () => Promise<unknown> | unknown
}

export default function useConfirmAction() {
    const { t } = useI18n()

    /**
     * 统一二次确认弹窗行为：
     * 1. 默认标题与按钮文案走同一套 i18n 文案
     * 2. 页面只关注“确认后做什么”，减少重复配置
     * 3. 保持 Arco Modal.confirm 的交互参数一致，避免各页表现漂移
     */
    const confirmAndRun = (options: ConfirmActionOptions): void => {
        const {
            title = t('确认'),
            content,
            okText = t('确认'),
            cancelText = t('取消'),
            onOk,
        } = options

        Modal.confirm({
            title,
            content,
            okText,
            cancelText,
            hideCancel: false,
            draggable: false,
            simple: false,
            onOk,
        })
    }

    return {
        confirmAndRun,
    }
}
