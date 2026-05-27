import accountApi from '@/api/userApi/account'
import kolInfluencerApi from '@/api/userApi/kolInfluencer'
import sysApi from '@/api/userApi/sys'
import tagApi from '@/api/userApi/tag'
import { mergeApiServices } from '@/api/userApi/mergeServices'

/**
 * userApi 历史主入口（兼容导出）。
 * 新代码应优先按前缀直接从对应模块引入，例如：
 * - /account -> '@/api/userApi/account'
 * - /sys -> '@/api/userApi/sys'
 */
const userApi = mergeApiServices(accountApi, kolInfluencerApi, sysApi, tagApi)

export default userApi
