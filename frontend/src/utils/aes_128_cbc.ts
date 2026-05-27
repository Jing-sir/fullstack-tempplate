/// NOTE: web.crypto 仅在 HTTPS 环境下可用
export const generateKey = (urlStr: string) => { // 根据url生成key
    return window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(urlStr),
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
    );
};

export async function generateIv(key: CryptoKey, isCompliance: boolean = true) { // 根据key生成iv
    const label = new TextDecoder('utf-8').decode(await crypto.subtle.exportKey('raw', key));
    const array = [];

    for (let idx = 1; idx <= label.length; idx += 1) { // 生成二叉树数组层级
        if ((idx & idx + 1) !== 0) continue;

        // 是否处于二叉树节点上[即是不是2的幂运算结果，附加已遍历过的二叉树节点数据]
        const index = idx - 1;
        const row = (Math.log2(idx + 1)); // 当前行数
        array.push(
            idx === 1
                ? label[index]
                : label.slice((2 ** (row/* 二叉树当前行数 */ - 1)) - 1, idx)
        );
    }

    const chars = array
        .map((item, index) => { // 反转二叉树数组
            if (index === 0) return item; // 首个无需反转
            let str = '';
            for (let idx = 1; idx <= item.length; idx += 1) {
                if (idx % 2 === 0) { // 偶数反转
                    const eq = idx - 1;
                    str += item[eq] + item[eq - 1]; // 交换元素位置
                }
            }
            return str;
        })
        .join('');

    // return crypto.getRandomValues(new TextEncoder().encode(chars));
    return new TextEncoder().encode(isCompliance ? chars.slice(0, 32) /* 合规的情况下只允许16位 */ : chars);
}

/**
 * 加密方法
 * @param {CryptoKey} key 加密的key
 * @param {ArrayBuffer} iv 加密的iv
 * @param {any} data  密文
 * @returns string
 */
export async function encrypt(key: string, iv: string, data: string) {
    const keyData = await generateKey(key);

    const encoder = new TextEncoder();
    const ivData = encoder.encode(iv);
    const dataToEncrypt = encoder.encode(data);

    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            length: 128,
            iv: ivData,
        },
        keyData,
        dataToEncrypt
    );

    return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
}

/**
 * 解密方法
 * @param {CryptoKey} key 解密的key
 * @param {ArrayBuffer} iv 解密的iv
 * @param {any} data  密文
 * @returns string
 */
export async function decrypt(key: string, iv: string, data: string) {
    const encoder = new TextEncoder();
    const ivData = encoder.encode(iv);
    const keyData = await generateKey(key);

    const dataToDecrypt = Uint8Array.from(atob(data), (str) => str.charCodeAt(0));

    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            length: 128,
            iv: ivData,
        },
        keyData,
        dataToDecrypt
    );

    const decoded = new TextDecoder('utf-8').decode(decryptedData);
    return typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
}
