import accountLogApi from './accountLog'
import securityApi from './security'
import { mergeApiServices } from '@/api/userApi/mergeServices'

/**
 * /sys 前缀接口统一主出口。
 * 目前按 accountLog/security 拆分，避免单文件继续膨胀。
 */
const sysApi = mergeApiServices(accountLogApi, securityApi)

export default sysApi
