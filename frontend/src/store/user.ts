import { defineStore } from 'pinia';
import sysAuthApi from '@/api/sys/auth';
import type { AuthUserInfo } from '@/api/sys/auth';
import { ref } from 'vue';

const createEmptyUserInfo = (): AuthUserInfo => ({
    account: '',
    bindAccount: '',
    fullName: '',
    isFACode: 0,
    roleId: '',
    roleName: '',
    state: 0,
    userId: '',
});

export default defineStore('user', () => {
    const pwdIv = ref(''); // IV 值
    const pwdIvId = ref(''); // IV ID
    const account = ref<string>();
    const userInfo = ref<AuthUserInfo>(createEmptyUserInfo());

    const getUserInfo = async () => { // 获取sidebar 列表路由
        userInfo.value = await sysAuthApi.loginInfo();
    };

    const setUserInfo = (info?: Partial<AuthUserInfo>): void => {
        userInfo.value = {
            ...createEmptyUserInfo(),
            ...info,
        };
        account.value = userInfo.value.account;
    };

    // 获取密钥
    const getPwdIv = async () => {
        const challenge = await sysAuthApi.getIVChallenge();
        pwdIv.value = challenge.iv;
        pwdIvId.value = challenge.iv_id;
    };

    return {
        pwdIv,
        pwdIvId,
        account,
        userInfo,
        getPwdIv,
        getUserInfo,
        setUserInfo
    };
});
