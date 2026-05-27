import { defineStore } from 'pinia';
import sysAuthApi from '@/api/sys/auth';
import { ref } from 'vue';

export default defineStore('user', () => {
    const pwdIv = ref(''); // 密钥
    const account = ref<string>();
    const userInfo = ref<PromiseReturnType<typeof sysAuthApi.loginInfo>>(Object.create(null));

    const getUserInfo = async () => { // 获取sidebar 列表路由
        userInfo.value = await sysAuthApi.loginInfo();
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
        getUserInfo
    };
});
