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
    const pwdIv = ref(''); // 密钥
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
        pwdIv.value = await sysAuthApi.pwdIv();
    };

    return {
        pwdIv,
        account,
        userInfo,
        getPwdIv,
        getUserInfo,
        setUserInfo
    };
});
