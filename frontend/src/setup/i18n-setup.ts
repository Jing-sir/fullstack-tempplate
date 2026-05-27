import { createI18n } from 'vue-i18n';
import http from 'axios';
import type { WritableComputedRef } from 'vue';
import type { Locale } from '@intlify/core-base';

import en_US from '../lang/en-US.json';
import zh_CN from '../lang/zh-CN.json';

type MessageSchema = typeof en_US | typeof zh_CN;

const messages: {
    [key in 'en-US' | 'zh-CN']: MessageSchema
} = { // 语言包
    'en-US': en_US,
    'zh-CN': zh_CN
};

type LangKeyString = keyof typeof messages;

const isProduction = import.meta.env.PROD;
const DEFAULT_LOCALE: LangKeyString = 'zh-CN';
const languages = Object.keys(messages) as LangKeyString[];

/**
 * 语言归一化策略：完全匹配 -> 前缀模糊匹配 -> 默认语言。
 * 关键点是兜底值必须来自受支持语言集合，避免把未注册 locale 写进 i18n 实例。
 */
const normalizeLocale = (lang = ''): LangKeyString => {
    const normalizedLang = lang.trim();
    if (!normalizedLang) return DEFAULT_LOCALE;

    const exactLocale = languages.find((locale) => locale.toLowerCase() === normalizedLang.toLowerCase());
    if (exactLocale) return exactLocale;

    const langPrefix = normalizedLang.split('-')[0]?.toLowerCase();
    const fuzzyLocale = languages.find((locale) => locale.toLowerCase().startsWith(`${langPrefix}-`));
    return fuzzyLocale ?? DEFAULT_LOCALE;
};

const localeDefault: LangKeyString = normalizeLocale(window.navigator.language);
const fallbackLocale: LangKeyString = localeDefault;

const i18n = createI18n({
    locale: fallbackLocale, // 设置语言环境
    fallbackLocale, // 如果未找到key,需要回溯到语言包的环境
    messages, // 设置语言环境信息
    legacy: false, // 是否不使用 composition-api 模式
    missingWarn: !isProduction,
    fallbackWarn: !isProduction,
});

export const getI18nLanguage = (): LangKeyString => i18n.global.locale.value; // 获取语言
export function setI18nLanguage(lang: string = fallbackLocale): Locale { // 设置规则：完全匹配 -> 模糊匹配 -> 默认语言
    const { global: { locale } } = i18n;
    const language: LangKeyString = normalizeLocale(lang);

    if (locale.value === language) return language; // 不允许重复设置语言

    // set i18n
    if (i18n.mode === 'legacy') {
        i18n.global.locale.value = language;
    } else {
        (i18n.global.locale as unknown as WritableComputedRef<LangKeyString>).value = language;
    }

    http.defaults.headers.common['Accept-Language'] = language; // set http

    document.documentElement?.setAttribute('lang', language.split(/-/)[0]); // set html
    return language;
}

export default i18n;
