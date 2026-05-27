import accountCardApi from '@/api/userApi/accountCard'
import bannerApi from '@/api/userApi/banner'
import cardOpenFirstConfigApi from '@/api/userApi/cardOpenFirstConfig'
import referralApi from '@/api/userApi/referral'
import shippingInformationApi from '@/api/userApi/shippingInformation'
import sysSecurityApi from '@/api/userApi/sys/security'
import transactionApi from '@/api/userApi/transaction'
import { mergeApiServices } from '@/api/userApi/mergeServices'

/**
 * userList 历史主入口（兼容导出）。
 * 新代码应优先按前缀从对应模块直接引入。
 */
const userListApi = mergeApiServices(
    referralApi,
    bannerApi,
    cardOpenFirstConfigApi,
    transactionApi,
    accountCardApi,
    shippingInformationApi,
    sysSecurityApi,
)

export default userListApi
