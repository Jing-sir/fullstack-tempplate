import type { VNode, App, Directive, DirectiveBinding } from 'vue';

import { hyphenate } from '@/utils/common';

type AssignerFn = (value: unknown) => void;

const invokeFns = (fns: AssignerFn[], value: unknown): void => {
    fns.forEach((fn) => {
        fn(value);
    });
};

const getModelAssigner = (vnode: VNode): AssignerFn | undefined => {
    const fn = vnode.props?.['onUpdate:modelValue'] || vnode.props?.['onModelCompat:input'];
    return Array.isArray(fn) ? (value) => invokeFns(fn as AssignerFn[], value) : fn;
};

export const onlyNumber: Directive = function (
    el: HTMLElement,
    { // 限制用户输入为number类型的value，行为特征跟type:number一致，但不会有样式兼容问题
        /* expression, */value, oldValue, arg = '0' // TODO 3.x缺少expression表达式
    }: DirectiveBinding,
    vNode: VNode
): void {
    const numberArg: number = Number(arg);
    const isEmptyValue = value === '' || value === null || typeof value === 'undefined';
    if (oldValue === value || !window.isFinite(numberArg) || isEmptyValue) return;

    const updateValue = getModelAssigner(vNode);
    if (typeof updateValue !== 'function') return;

    const stringArg: string = String(arg);
    const digit: number = Number(/\./.test(stringArg) ? stringArg.split('.').slice(-1)[0].length : stringArg);
    const transformValue = String(value).split('.')[1]?.length > digit ? Number(value).toFixed(digit + 1).slice(0, -1) : value; // 防止用户复制粘贴
    const newValue = new RegExp(`^\\-?\\d*\\.?\\d{0,${digit}}$`).test(transformValue) ? transformValue : oldValue; // 处理用户正常输入

    const inputEl: HTMLInputElement = (el.tagName === 'INPUT' ? <HTMLInputElement>el : <HTMLInputElement>el.querySelector('input'));
    if (inputEl === null) return;
    inputEl.onblur = ({ target }: FocusEvent) => {
        const inputValue = String((target as HTMLInputElement)?.value ?? '').trim();
        updateValue(inputValue === '' ? '' : Number(inputValue));
    }; // addEventListener不可覆盖，此处请勿使用监听函数处理

    updateValue(typeof oldValue === 'undefined' ? Number(value).toFixed(digit + 1).slice(0, -1) /* 第一次及时处理原始值的小数位数，后续再失去焦点才补全小数位数 */ : newValue);
};

export default {
    install: (app: App): void => {
        app.directive(hyphenate(onlyNumber.name), onlyNumber);
    }
};
