import { Api } from '../api';
import type { SystemUserRow } from '@/interface/SystemManageType';
import { buildTableFetchResult } from '@/utils/table';

export interface SysUserListParams {
    account?: string;
    realName?: string;
    pageNo?: number;
    pageSize?: number;
}

export interface SysUserInfoResult {
    userId: string;
    account: string;
    fullName: string;
    roleId: string;
    roleName: string;
    state: number;
}

export interface SysUserAddOrUpdateParams {
    id?: string;
    account?: string;
    fullName?: string;
    roleId?: string;
    state?: number;
}

export interface SysUserResetPasswordParams {
    userId: string;
    password: string;
    facode?: string;
    type?: number;
}

export interface SysUserResetSecretParams {
    userId: string;
    password: string;
    facode?: string;
}

interface SysUserListResponse {
    list: SystemUserRow[];
    total: number;
}

class SysAccountApi extends Api {
    async sysUserList(params: SysUserListParams) {
        const result = await this.api.post<
            SysUserListResponse,
            SysUserListResponse,
            SysUserListParams
        >('/admin-users/list', params);
        return buildTableFetchResult<SystemUserRow>({
            response: result,
            params,
            totalKeys: ['total'],
        });
    }

    async sysUserInfo(params: { userId: string }): Promise<SysUserInfoResult> {
        return this.api.get<SysUserInfoResult, SysUserInfoResult>('/admin-users/detail', {
            params,
        });
    }

    async sysUserAddOrUpdate(params: SysUserAddOrUpdateParams): Promise<void> {
        await this.api.post<void, void, SysUserAddOrUpdateParams>('/admin-users', params);
    }

    async sysUserResetPassword(params: SysUserResetPasswordParams): Promise<void> {
        await this.api.post<void, void, SysUserResetPasswordParams>(
            '/admin-users/reset-password',
            params,
        );
    }

    async setSysUserResetSecret(params: SysUserResetSecretParams): Promise<void> {
        await this.api.post<void, void, SysUserResetSecretParams>(
            '/admin-users/reset-2fa',
            params,
        );
    }
}

export default new SysAccountApi();
