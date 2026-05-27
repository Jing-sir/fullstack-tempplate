export enum commonLevelEnum {
    None,
    Primary,
    Advanced,
}

export interface ICommonLevel {
    label: string
    value: commonLevelEnum
    colorName?: string
}

export const commonLevelEnumMap = new Map<commonLevelEnum, ICommonLevel>([
    [commonLevelEnum.None, { label: '未认证', value: commonLevelEnum.None }],
    [commonLevelEnum.Primary, { label: '初级认证', value: commonLevelEnum.Primary }],
    [commonLevelEnum.Advanced, { label: '高级认证', value: commonLevelEnum.Advanced }],
])

export enum whitelistStateEnum {
    Disable,
    Enable,
}

export interface IWhitelistState {
    label: string
    value: whitelistStateEnum
    colorName?: string
}

export const whitelistStateEnumMap = new Map<whitelistStateEnum, IWhitelistState>([
    [
        whitelistStateEnum.Disable,
        {
            label: '禁用',
            value: whitelistStateEnum.Disable,
            colorName: 'text-color-red',
        },
    ],
    [
        whitelistStateEnum.Enable,
        {
            label: '启用',
            value: whitelistStateEnum.Enable,
            colorName: 'text-color-green',
        },
    ],
])
