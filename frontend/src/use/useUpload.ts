import type { FileItem } from '@/interface/TableType'
import { Message } from '@arco-design/web-vue';
import { formatText } from '@/utils/common';

export default function useUpload() {
    const beforeUpload = (file: FileItem) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
        if (!isJpgOrPng) {
            Message.error(formatText('请上传jpg或png格式文件'));
        }
        const isLt2M = file.size / 1024 / 1024 < 5;
        if (!isLt2M) {
            Message.error(formatText('请上传5M以内的图片'));
        }
        return isJpgOrPng && isLt2M;
    };

    return {
        beforeUpload
    };
}
