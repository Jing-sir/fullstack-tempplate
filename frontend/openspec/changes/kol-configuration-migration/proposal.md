## Why

旧项目 KolConfiguration 模块（KOL推广计划）使用 Ant Design Vue + Options API + 手写表格骨架，需迁移到新项目的 Arco Design + `<script setup>` + TableSearchWrap 架构，消除技术债并统一代码规范。

## What Changes

**旧项目文件清单（5 个 .vue 文件）：**
- `KolConfiguration/KOLInvitationList/Index.vue` — KOL申请列表（列表+导出）
- `KolConfiguration/AgentCardOpeningConfiguration/Index.vue` — KOL开卡配置（列表+新增/编辑）
- `KolConfiguration/AgentCardOpeningConfiguration/AddOrUpdata.vue` — 开卡配置新增/编辑弹窗
- `KolConfiguration/RebateBusinessConfiguration/Index.vue` — 返佣业务配置（列表+批量操作+启停）
- `KolConfiguration/RebateBusinessConfiguration/components/AddEditExamine.vue` — 返佣配置新增/编辑/查看弹窗

**新增/迁移内容：**
- 新建 `src/views/KolConfiguration/` 模块目录，包含 3 个子页面
- 补全 `src/api/kolConfiguration/index.ts`：新增 7 个缺失的 API 方法（见下方 Impact）
- 新增 `src/enums/statusText.ts` 中的 `kolRebateState` preset（状态：已开启/已关闭）
- 注册路由到 `src/routes/permissionRoutes.ts`（`/kolConfiguration` 父路由 + 3 个子路由）

**迁移时修复的技术债：**
- 手写 `<a-form>` + `<a-table>` + `<Pagination>` 三件套 → TableSearchWrap
- `defineComponent` + Options API → `<script setup>`
- `ant-design-vue` 组件 → `@arco-design/web-vue` 等价组件
- `message.success` → `Message.success`（arco）
- 弹窗平铺在模块目录 → `modal/` 子目录
- `Promise<any>` → 显式类型
- 内嵌 `interface` → `export interface`
- 静态文案裸写中文 → `t('...')`
- `onMounted` 触发列表 → `useOnActivated`
- 手写 `Modal.confirm` 删除/批量操作 → `useConfirmAction`
- `cardInventory` store 依赖（`getlistData`）→ 直接调用接口或局部 ref

## Capabilities

### New Capabilities
- `kol-invitation-list`：KOL申请列表，支持邮箱/阶梯费率搜索、导出
- `kol-opening-config`：KOL开卡配置，支持合伙人UID搜索、新增/编辑、UID关联用户信息查询
- `kol-rebate-config`：返佣业务配置，支持多条件搜索、批量开启/关闭/删除、单条启停、新增/编辑/查看

### Modified Capabilities
（无已有 spec 需修改）

## Impact

**API 层：`src/api/kolConfiguration/index.ts`**

新项目现有方法（已迁移，仅需整理类型）：
- `fetchGetKolInfluencerList` — KOL列表
- `fetchEnableKolInfluencer` — KOL启用/禁用/取消身份
- `fetchGetKolInfluencerExistUser` — 校验UID
- `fetchGetKolInfluencerAdd` — 新增KOL

缺失、需补充的方法：
- `fetchgetOpenConfigList` — KOL开卡配置列表（GET `/agent/openConfig/list`）
- `fetchgetOpenConfigAddOrUpdate` — 新增/编辑开卡配置（POST `/agent/openConfig/addOrUpdate`）
- `fetchgetOpenConfigDel` — 删除开卡配置（GET `/agent/openConfig/del`）
- `fetchgetAccountId` — 查询用户信息（GET `/account/:id`）
- `fetchGetKolRebateConfList` — 返佣配置列表（POST `/KolRebateConf/list`）
- `fetchGetKolRebateConfAddOrUpdate` — 新增/编辑返佣配置（POST `/KolRebateConf/addOrUpdate`）
- `fetchEnableKolRebateConfBatchOpenOrClose` — 批量启停（POST `/KolRebateConf/batchOpenOrClose`）
- `fetchKolRebateConfBatchDelete` — 批量删除（POST `/KolRebateConf/batchDelete`）
- `fetchGetKOLInvitationList` — KOL申请列表（GET `/kolApply/list`）
- `kolApplyExport` — KOL申请列表导出（GET `/kolApply/export`，responseType: blob）

**路由：`src/routes/permissionRoutes.ts`**
新增 `/kolConfiguration` 父路由及 3 个子路由：
- `rebateBusinessConfiguration` — 返佣业务配置
- `agentCardOpeningConfiguration` — KOL开卡配置
- `invitationList` — KOL申请列表

**枚举：`src/enums/statusText.ts`**
新增 `kolRebateState` preset：`{ 1: '已开启', 2: '已关闭' }`（带颜色映射）

**渠道卡列表依赖：**
RebateBusinessConfiguration 和 AgentCardOpeningConfiguration 的弹窗均依赖渠道卡列表数据（`ditchInfoList`），来自旧项目 channel API 的 `featgetDitchInfo`。需确认新项目 channel API 已有该方法，否则需补充。
