import { Api } from '@/api/api'

class KolInfluencerApi extends Api {
    /** 查询 KOL 是否代理商 */
    getKolInfluencerAgentStatus(params: { accountId: string }): Promise<boolean> {
        return this.api.get('/kolInfluencer/isAgent', { params })
    }
}

export default new KolInfluencerApi()
