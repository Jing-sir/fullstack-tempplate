export const NUMBER_MAX = Number.MAX_SAFE_INTEGER; // 安全区域内的最大数值[Java = Integer.MAX_VALUE = 2 ** 31 - 1]
export const NUMBER_MIN = Number.MIN_SAFE_INTEGER; // 安全区域内的最小数值
export const PASSWORD = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d!@#$%^&*().,;?`'"/\[\]{}\-_+=|:<>~\\ ]{6,30}$/; // 6-15位数字 + 大小写字母密码
export const SIX_NUMBER = /^[0-9]{6}$/; // 6为正实数密码 / code
export const THOUSANDS_REGULAR = /\B(?=(\d{3})+(?!\d))/g; // 千分符
export const NUMBER = /^(1|[1-9][0-9]*)$/; // 只能输入1和非零开头的数字
export const INTER_NUMBER = /^[0-9]\d*$/; // 正整数限制输入
export const IP_V4 = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/; // ip地址校验
export const IP_V6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$/; // ip v6地址校验
export const GREATER_THAN_ZERO_NUMBER = /^(0\.\d+|[1-9]\d*(\.\d+)?)$/; // 大于0的正则
export const EMAIL = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/; // 邮箱
export const VERSION_NUMBER_RULES =
    /^([1-9]\d|[1-9])(\.([1-9]\d|\d)){2}(\+([a-zA-z0-9]*[0-9]+[a-zA-z0-9]*))$/; // 版本号正则
export const DECIMAL_TWO = /^([0]|([1-9][0-9]*)|(([0]\.\d{1,2}|[1-9][0-9]*\.\d{1,2})))$/; // 非负数，最多两位小数（开卡费、返佣比例等）
export const DECIMAL_SIX = /^(\d+)?([.]?\d{0,6})?$/; // 非负数，最多六位小数（费率配置等）
export const COMMA_NUMBERS = /^[0-9,]+$/; // 数字与逗号组合（限额范围等）
export const NINETEEN_DIGITS = /^\d{19}$/; // 19位纯数字（用户ID等）

interface PagingType {
    size: string;
    showPageSize: boolean;
    pageSizeOptions: number[];
    showJumper: boolean;
    // Arco 当前版本的 PaginationProps.showTotal 只接受 boolean，
    // 这里不要再沿用旧版“函数返回总数文案”的配置写法。
    showTotal: boolean;
    total: number
    current: number
    pageSize: number
}

export const PagingDefaultConf: PagingType = {
    // paging 默认数据
    size: 'small',
    showPageSize: true,
    pageSizeOptions: [20, 30, 40, 50],
    showJumper: true,
    showTotal: true,
    total: 0,
    current: 1,
    pageSize: 20,
};

// 用户标签颜色（与老项目保持同源，避免不同页面出现色板不一致）
export const colorArr = [
    '#E3CCC6',
    '#C68977',
    '#B66852',
    '#A25742',
    '#F4E9D7',
    '#E3C89D',
    '#CB924F',
    '#BA7E42',
    '#80552A',
    '#F3EDCB',
    '#EFE19A',
    '#E3CA65',
    '#BB9F4C',
    '#735F2C',
    '#EAEDB4',
    '#D2DA84',
    '#A0A94D',
    '#888F42',
    '#666B31',
    '#E4F1D7',
    '#C3DEA7',
    '#90B46A',
    '#7E9E5D',
    '#7A994B',
    '#DFEFEC',
    '#90B6AB',
    '#7DA195',
    '#516A64',
    '#BFD8F6',
    '#83ABDE',
    '#6F91BF',
    '#50688C',
    '#E7E8FD',
    '#CAD4F8',
    '#91A1EF',
    '#6E84EA',
    '#4259DB',
    '#DFC9DE',
    '#BC87B1',
    '#AA6D9E',
    '#884772',
    '#D5CEF7',
    '#A699EB',
    '#8A79E1',
    '#604ADB',
    '#92959C',
    '#676A71',
    '#3B3C41',
];
