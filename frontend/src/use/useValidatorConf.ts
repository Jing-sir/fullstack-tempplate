import { GREATER_THAN_ZERO_NUMBER, INTER_NUMBER, IP_V4, IP_V6 } from '@/utils/constant'
import type { FieldRule } from '@arco-design/web-vue';
import { formatText } from '@/utils/common';

export default function useValidatorConf() {
    const validateNumber = async (rule: FieldRule, value: string) => { // 验证码验证
        if (value === '') return Promise.reject(formatText('请输入'));
        if (!INTER_NUMBER.test(value)) return Promise.reject(formatText('非法输入'));

        return Promise.resolve();
    };

    const validateNumInput = async (rule: FieldRule, value: string) => { // 验证码验证
        if (value === '') return Promise.reject(formatText('请输入'));
        if (!value) return Promise.reject(formatText('无效金额'));
        if (!GREATER_THAN_ZERO_NUMBER.test(value)) return Promise.reject(formatText('无效金额'));

        return Promise.resolve();
    };

    const validateIp = async (rule: FieldRule, value: string) => { // 验证码验证
        if (value === '') return Promise.reject(formatText('请输入'));
        if (!IP_V4.test(value) && !IP_V6.test(value)) return Promise.reject(formatText('请输入有效ip地址'));

        return Promise.resolve();
    };

    return {
        validateIp,
        validateNumber,
        validateNumInput,
    };
}
