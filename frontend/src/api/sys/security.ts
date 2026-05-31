import { Api } from '../api';

interface CheckCipherParams {
    password: string;
    userId: string;
}

class SysSecurityApi extends Api {
    async checkCipher(params: CheckCipherParams): Promise<void> {
        await this.api.post<void, void, CheckCipherParams>('/user/password/check', params);
    }
}

export default new SysSecurityApi();
