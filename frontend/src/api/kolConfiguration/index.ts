import { Api } from '@/api/api'
import type { Pagination } from '@/interface/type'

// ─── KOL 列表 ────────────────────────────────────────────────────────────────

interface KolInfluencerRow extends Record<string, unknown> {
    id: string
    accountId: string
    userTypeName?: string
    invitationCode?: string
    surname?: string
    name?: string
    labelName?: string
    authStateName?: string
    advancedAuthStateName?: string
    email?: string
    globalCode?: string
    phone?: string
    state: 1 | 2 | 3
    stateName?: string
    createTime?: string
    updateTime?: string
}

// ─── KOL 申请列表 ─────────────────────────────────────────────────────────────

export interface KolInvitationItem {
    id: string
    email: string
    gradeName: string       // 阶梯费率名称
    gradeOther: string      // 等级其他
    communityNum: number    // 社区人数
    contact: string         // 联系人
    contactPhone: string    // 联系电话
    repairRemark: string    // 其它说明
    createTime: string
    updateTime: string
}

// ─── KOL 开卡配置 ─────────────────────────────────────────────────────────────

export interface OpenConfigItem {
    id: string
    agentAccountId: string  // 合伙人用户UID
    rebateRangeName: string // 卡费范围名称
    cardType: string        // 卡类型
    ditchName: string       // 渠道名称
    email: string           // 用户邮箱
    openFee: string         // 开卡费（USDT）
    rebateRange: number     // 卡费范围：1=全部用户 3=指定用户
    createTime: string
    updateTime: string
}

export interface OpenConfigAddOrUpdateParams {
    agentAccountId: string  // 合伙人用户UID（新增必填，编辑不可改）
    email: string           // 开卡邮箱（rebateRange=3 时有值，多邮箱逗号分隔）
    openFee: string         // 开卡费，两位小数
    rebateRange: number     // 1=全部用户 3=指定用户
    id?: string             // 编辑时传入
}

// ─── 返佣业务配置 ─────────────────────────────────────────────────────────────

export interface KolRebateConfItem {
    id: string
    bizType: number         // 业务类型：1=开卡 2=充值
    bizTypeName: string
    cardName: string        // 卡片名称
    cardType: number        // 卡类型：1=虚拟卡 2=实体卡
    cardTypeName: string
    ditchName: string       // 渠道名称
    endTimeStr: string      // 结束时间（格式化后）
    rebateRange: number     // 返佣范围：1=全局 3=用户
    rebateRangeName: string
    rebateRangeValue: string // 范围详情（多 UID 逗号分隔）
    rebateRatio: number     // 返佣比例（%）
    startTimeStr: string    // 起始时间（格式化后）
    state: 1 | 2            // 1=已开启 2=已关闭
    updateTime: string
}

export interface KolRebateConfListParams {
    bizType?: number | null
    cardName?: string | null
    cardType?: number | null
    ditchName?: string | null
    accountId?: string
    startTime?: number
    endTime?: number
    state?: number | null
    pageNo: number
    pageSize: number
}

export interface KolRebateConfAddOrUpdateParams {
    bizType: number | undefined        // 1=开卡 2=充值（编辑时禁用）
    ditchCardId: string | undefined    // 渠道卡id（编辑时禁用）
    rebateRange: number | undefined    // 1=全局 3=用户（编辑时禁用）
    rebateRangeValue?: string          // 用户UID，逗号分隔（range=3 时必填）
    rebateRatio: string | undefined    // 返佣比例（0-100，两位小数）
    state: number | undefined          // 1=启用 2=关闭
    startTime: number | undefined      // 生效开始时间（时间戳）
    endTime: number | undefined        // 生效结束时间（时间戳）
    id?: string                        // 编辑时传入
}

// ─── 渠道卡列表（供弹窗下拉使用）────────────────────────────────────────────

export interface DitchInfoItem {
    id: number
    name: string
}

class KolConfigurationApi extends Api {
    // ── KOL 列表 ──────────────────────────────────────────────────────────────

    /**
     * 用户管理 - KOL 列表。
     * 沿用旧项目接口协议，避免迁移期改动后端入参与分页字段。
     */
    fetchGetKolInfluencerList(params: Record<string, unknown>): Promise<{ list: KolInfluencerRow[] } & Pagination> {
        return this.api.post('/kolInfluencer/list', params)
    }

    /** KOL 状态切换（启用/禁用/取消身份）。 */
    fetchEnableKolInfluencer(params: { id: string; state: 1 | 2 | 3 }): Promise<boolean> {
        return this.api.get('/kolInfluencer/enable', { params })
    }

    /** 校验 UID 是否可作为 KOL 添加。 */
    fetchGetKolInfluencerExistUser(params: { accountId: string }): Promise<boolean> {
        return this.api.get('/kolInfluencer/existUser', { params })
    }

    /** 新增 KOL 用户。 */
    fetchGetKolInfluencerAdd(params: {
        accountId: string
        email: string
        globalCode: string
        phone: string
    }): Promise<boolean> {
        return this.api.post('/kolInfluencer/add', params)
    }

    // ── KOL 申请列表 ──────────────────────────────────────────────────────────

    /** KOL申请列表（GET /kolApply/list）*/
    fetchGetKOLInvitationList(params: {
        email?: string
        grade?: number | null
        pageNo: number
        pageSize: number
    }): Promise<{ list: KolInvitationItem[] } & Pagination> {
        return this.api.get('/kolApply/list', { params })
    }

    /** KOL申请列表导出（GET /kolApply/export，blob）*/
    kolApplyExport(params: { email?: string; grade?: number | null }): Promise<Blob> {
        return this.api.get('/kolApply/export', { params, responseType: 'blob' })
    }

    // ── KOL 开卡配置 ──────────────────────────────────────────────────────────

    /** KOL开卡配置列表（GET /agent/openConfig/list）*/
    fetchgetOpenConfigList(params: {
        agentAccountId?: string
        pageNo: number
        pageSize: number
    }): Promise<{ list: OpenConfigItem[] } & Pagination> {
        return this.api.get('/agent/openConfig/list', { params })
    }

    /** 新增/编辑开卡配置（POST /agent/openConfig/addOrUpdate）*/
    fetchgetOpenConfigAddOrUpdate(params: OpenConfigAddOrUpdateParams): Promise<boolean> {
        return this.api.post('/agent/openConfig/addOrUpdate', params)
    }

    /**
     * 查询用户信息（GET /account/:id），UID blur 时回显用户信息。
     * 返回 email 或 globalCode+phone，失败时调用方清空显示。
     */
    fetchgetAccountId(params: { id: string }): Promise<{ email: string; globalCode: string; phone: string }> {
        return this.api.get(`/account/${params.id}`)
    }

    // ── 返佣业务配置 ──────────────────────────────────────────────────────────

    /** 返佣配置列表（POST /KolRebateConf/list）*/
    fetchGetKolRebateConfList(params: KolRebateConfListParams): Promise<{ list: KolRebateConfItem[] } & Pagination> {
        return this.api.post('/KolRebateConf/list', params)
    }

    /** 新增/编辑返佣配置（POST /KolRebateConf/addOrUpdate）*/
    fetchGetKolRebateConfAddOrUpdate(params: KolRebateConfAddOrUpdateParams): Promise<boolean> {
        return this.api.post('/KolRebateConf/addOrUpdate', params)
    }

    /** 批量启停返佣配置（POST /KolRebateConf/batchOpenOrClose）*/
    fetchEnableKolRebateConfBatchOpenOrClose(params: { ids: string; state: 1 | 2 }): Promise<boolean> {
        return this.api.post('/KolRebateConf/batchOpenOrClose', params)
    }

    /** 批量删除返佣配置（POST /KolRebateConf/batchDelete，ids 逗号分隔）*/
    fetchKolRebateConfBatchDelete(params: { ids: string }): Promise<boolean> {
        return this.api.post('/KolRebateConf/batchDelete', params)
    }

    // ── 公共 ──────────────────────────────────────────────────────────────────

    /**
     * 渠道卡信息列表（GET /ditchCardInfo/ditchInfo）。
     * 供开卡配置和返佣配置弹窗的卡片名称下拉使用。
     * state=1 表示仅查启用状态的渠道卡。
     */
    fetchDitchInfoList(params?: { state?: 1 | 2 }): Promise<DitchInfoItem[]> {
        return this.api.get('/ditchCardInfo/ditchInfo', { params })
    }
}

export default new KolConfigurationApi()
