import { formatText } from '@/utils/common';

// 解密函数
export async function decryptAESGCM(encryptedKeyBase64: string, keyStr: string, ivStr: string): Promise<string> {
    // 将字符串密钥和 IV 转换为 Uint8Array
    const keyBytes = Uint8Array.from([...keyStr].map((c) => c.charCodeAt(0)));
    const ivBytes = Uint8Array.from([...ivStr].map((c) => c.charCodeAt(0)));

    // 将 base64 编码的密钥转换为 Uint8Array
    const encryptedKey = Uint8Array.from(atob(encryptedKeyBase64), (c) => c.charCodeAt(0));

    // 导入 AES-GCM 密钥
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);

    try {
        // 解密操作
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedKey);

        // 将解密后的 ArrayBuffer 转换为字符串
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (err) {
        console.error(formatText('解密失败'), err);
        throw new Error(formatText('解密失败'));
    }
}

export async function encryptAESGCM(plainText: string, keyStr: string, ivStr: string): Promise<string> {
    // 将字符串密钥和 IV 转换为 Uint8Array
    const keyBytes = Uint8Array.from([...keyStr].map((c) => c.charCodeAt(0)));
    const ivBytes = Uint8Array.from([...ivStr].map((c) => c.charCodeAt(0)));

    // 导入 AES-GCM 密钥
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);

    // 将明文转换为 Uint8Array
    const encoder = new TextEncoder();
    const plainTextBytes = encoder.encode(plainText);

    try {
        // 加密操作
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: ivBytes,
            },
            key,
            plainTextBytes,
        );

        // 将加密后的 ArrayBuffer 转换为 Base64 编码的字符串
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (err) {
        console.error(formatText('加密失败'), err);
        throw new Error(formatText('加密失败'));
    }
}
