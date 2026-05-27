export interface SystemUserRow {
    [key: string]: unknown;
    account: string;
    bindAccount?: string;
    lastLoginTime: string;
    realName: string;
    roleId: string;
    roleName: string;
    state: number;
    userId: string;
    isFACode?: 0 | 1;
}

export interface SystemRoleItem {
    [key: string]: unknown;
    roleId: string;
    roleName: string;
}

export interface RolePermissionsType {
    [key: string]: unknown;
    roleId: string;
    roleName: string;
    remark?: string;
    state?: 1 | 2;
}

export interface TreeDataType {
    [key: string]: unknown;
    menuId: string;
    menuName: string;
    parentId: string;
    checked?: number;
    checkUserPassword?: number;
    disableCheckbox?: boolean;
    children?: TreeDataType[];
}

export interface OperationLogRow {
    [key: string]: unknown;
    id: string;
    opAccount: string;
    opTime: string;
    ip: string;
    reqFunc: string;
    reqUrl: string;
    reqData: string;
    respData: string;
    reqMethod: string;
    elapsedTime: number | string;
    occurErr: boolean | number;
    errMsg: string;
    success: boolean | number;
}
