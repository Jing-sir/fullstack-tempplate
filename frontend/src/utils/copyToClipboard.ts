import i18n from '@/setup/i18n-setup';

type LegacyClipboardDocument = Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
};

export default function copyToClipboard(text:string) {
    const input = document.createElement('input');
    const commandName = 'copy'; // https://developer.mozilla.org/zh-CN/docs/Web/API/Document/execCommand#%E5%91%BD%E4%BB%A4
    input.value = text;
    Object.entries({
        opacity: 0,
        position: 'fixed',
        zIndex: -1
    }).forEach(([key, value]:[string, string|number]) => {
        input.style.setProperty(key, String(value));
    });
    input.setAttribute('readonly', 'readonly');
    document.body.appendChild(input);
    try {
        input.focus();
        input.setSelectionRange(0, input.value.length);

        const legacyDocument = document as LegacyClipboardDocument;
        const isCopied = typeof legacyDocument.execCommand === 'function' &&
            legacyDocument.execCommand(commandName, false, '');
        if (!isCopied) {
            throw new Error(String(i18n.global.t('复制时发生错误')));
        }
    } finally {
        // 无论复制成功还是失败，都保证及时释放临时节点，避免页面残留。
        input.blur();
        document.body.removeChild(input);
    }
}
