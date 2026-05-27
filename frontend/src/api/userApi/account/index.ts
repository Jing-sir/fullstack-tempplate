import accountListApi from './list'
import accountAuthApi from './auth'
import { mergeApiServices } from '@/api/userApi/mergeServices'

/**
 * /account 前缀接口统一主出口。
 * 当 account 相关接口继续增长时，优先在本目录按领域继续拆分，再从这里聚合导出。
 */
const accountApi = mergeApiServices(accountListApi, accountAuthApi)

export default accountApi
