import type { subSumStatusEnum } from '@/api/userApi/userEnum';

export interface AccountParams {
    accountId: string;
    agentId: string; // 代理商ID
    state: 1 | 2 | 3 | ''; // 状态：1=正常,2=冻结,3=注销
    authState: 0 | 1 | 2 | 3 | '';
    advancedAuthState: 0 | 1 | 2 | 3 | '';
    email: '';
    parentInvitationCode: string;
    invitationCode: string;
    time?: Array<any>;
    startTime: string;
    endTime: string;
    pageNo?: number;
    pageSize?: number;
    country?: string;
    phone: string;
    customerNo: string;
    labelId?: string | null; // 标签ID
    closeAccountCheck?: 1 | 2 | 3 | ''; // 注销审核状态: :1、注销审核中 2、审核通过 3、审核拒绝
    documentType: null | any
}
export interface AccountList extends Record<string, unknown> {
    advancedAuthState: 0 | 1 | 2 | 3; // 认证状态：0=未认证，1=认证中，2=成功，3=失败
    agentName: string; // 代理商名称
    authState: 0 | 1 | 2 | 3; // 认证状态：0=未认证，1=认证中，2=成功，3=失败
    createTime: string; // 创建时间
    email: string; // 邮箱
    id: string;
    invitationCode: string; // 邀请码
    name: string; // 名
    surname: string; // 姓
    state: 1 | 2 | 3; // 状态：1=启用,2=禁用,3=注销
}

export interface AccountLogParams {
    accountId: string;
    browserLanguage: string;
    deviceLanguage: string;
    endTime: string;
    hostName: string;
    ipAddress: string;
    macAddress: string;
    operated: string;
    pageNo: number;
    pageSize: number;
    platform: number | null;
    platformLanguage: string;
    startTime: string;
    usernameCn: string;
    usernameEn: string;
    nationalNumber: string;
    deviceId: string;
    labelId: string | null;
}
export interface AccountLogData {
    accountId: string;
    browserLanguage: string;
    code: number;
    createTime: string;
    deviceLanguage: string;
    hostName: string;
    id: number;
    ipAddress: string;
    macAddress: string;
    operated: string;
    operatedId: string;
    platform: number;
    platformLanguage: string;
    remark: string;
    subType: number;
    type: number;
    userAgent: string;
    username: string;
    timeZone: string;
}

export interface IUserAuthInfo {
    accountId: string;
    applicantId: string;
    backUri: string;
    countryCode: string;
    createTime: string;
    dob: string;
    documentAddress: string;
    documentNumber: string;
    documentType: number;
    expirationDate: string;
    faceUri: string;
    frontUri: string;
    gender: number;
    givenName: string;
    id: number;
    inspectionId: string;
    issuingDate: string;
    lastName: string;
    liveness: string;
    livingCountryCode: string;
    middleMing: string;
    ming: string;
    reviewAnswer: string;
    selfie: string;
    type: number;
    updateTime: string;
    xing: string;
    primaryStatus: subSumStatusEnum;
    reviewStatus: subSumStatusEnum;
}

interface IUserAuthDetail {
    accountId: string;
    applicantId: string;
    backUri: string;
    countryCode: string;
    createTime: string;
    dob: string;
    documentAddress: string;
    documentNumber: string;
    documentType: number;
    expirationDate: string;
    faceUri: string;
    frontUri: string;
    gender: number;
    givenName: string;
    inspectionId: string;
    issuingDate: string;
    lastName: string;
    liveness: string;
    livingCountryCode: string;
    middleMing: string;
    ming: string;
    reviewAnswer: string;
    reviewStatus: subSumStatusEnum;
    reviewRejectType: string;
    selfie: string;
    type: number;
    updateTime: string;
    xing: string;
    primaryStatus: subSumStatusEnum;
    primaryClientComment: string;
    primaryAnswer: string;
    rejectLabels: string;
    primaryRejectLabels: string;
    clientComment: string;
}

export interface DocumentList {
    accountId: string;
    applicantId: string;
    backUri: string;
    clientComment: string;
    countryCode: string;
    countryCodeName: string;
    createTime: string;
    dob: string;
    documentAddress: string;
    documentNumber: string;
    documentType: number;
    documentTypeName: string;
    expirationDate: string;
    frontUri: string;
    issuingDate: string;
    livingCountryCode: string;
    livingCountryName: string;
    ming: string;
    nationality: string;
    nationalityName: string;
    reviewAnswer: 'WAIT' | 'GREEN' | 'RED';
    sex: string;
    xing: string;
}

export interface authenticationInfo {
    documentList: DocumentList[];
    faceAnswer: 'WAIT' | 'GREEN' | 'RED';
    faceUri: string;
    givenName: string;
    lastName: string;
    rejectLabels: string;
    createTime: string;
}
