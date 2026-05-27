## 1. 前置准备

- [x] 1.1 确认 `src/api/channel/index.ts`（或等效文件）中存在 `featgetDitchInfo({ state: 1 })` 方法，记录其所在文件路径，供后续弹窗调用
  > 新项目尚无 channel API，`fetchDitchInfoList` 已直接补充到 `src/api/kolConfiguration/index.ts`
- [x] 1.2 在 `src/enums/statusText.ts` 中新增 `kolRebateState` preset：`{ 1: { text: '已开启', color: 'green' }, 2: { text: '已关闭', color: 'red' } }`。验证：grep 确认 key 已存在，pnpm run typecheck 无报错
- [x] 1.3 创建目录结构：`src/views/KolConfiguration/kol-invitation-list/`、`src/views/KolConfiguration/kol-opening-config/modal/`、`src/views/KolConfiguration/kol-rebate-config/modal/`

## 2. API 层补全

- [x] 2.1 在 `src/api/kolConfiguration/index.ts` 中补充以下 export interface 类型（不新建 types 文件）：
  - `KolInvitationItem`（字段：id, email, gradeName, gradeOther, communityNum, contact, contactPhone, repairRemark, createTime, updateTime）
  - `OpenConfigItem`（字段：agentAccountId, rebateRangeName, cardType, ditchName, email, openFee, createTime, updateTime, id, rebateRange）
  - `OpenConfigAddOrUpdateParams`（字段：agentAccountId, email, openFee, id?, rebateRange）
  - `KolRebateConfItem`（字段：id, bizType, bizTypeName, cardName, cardType, cardTypeName, ditchName, endTimeStr, rebateRange, rebateRangeName, rebateRangeValue, rebateRatio, startTimeStr, state, updateTime）
  - `KolRebateConfAddParams`（字段：bizType, ditchCardId, rebateRange, rebateRangeValue?, rebateRatio, state, startTime, endTime, id?）
  验证：pnpm run typecheck 无报错

- [x] 2.2 在 `src/api/kolConfiguration/index.ts` 中补充以下 API 方法（均继承 Api 基类，禁止 Promise<any>）：
  - `fetchGetKOLInvitationList(params)` — GET `/kolApply/list`，返回 `Promise<{ list: KolInvitationItem[] } & Pagination>`
  - `kolApplyExport(params)` — GET `/kolApply/export`，responseType: blob，返回 `Promise<Blob>`
  验证：grep 确认两个方法存在，pnpm run typecheck 无报错

- [x] 2.3 补充开卡配置相关方法：
  - `fetchgetOpenConfigList(params: { agentAccountId?: string; pageNo: number; pageSize: number })` — GET `/agent/openConfig/list`
  - `fetchgetOpenConfigAddOrUpdate(params: OpenConfigAddOrUpdateParams)` — POST `/agent/openConfig/addOrUpdate`
  - `fetchgetAccountId(params: { id: string })` — GET `/account/:id`，返回 `Promise<{ email: string; globalCode: string; phone: string }>`
  验证：pnpm run typecheck 无报错

- [x] 2.4 补充返佣配置相关方法：
  - `fetchGetKolRebateConfList(params: KolRebateConfListParams)` — POST `/KolRebateConf/list`
  - `fetchGetKolRebateConfAddOrUpdate(params: KolRebateConfAddParams)` — POST `/KolRebateConf/addOrUpdate`
  - `fetchEnableKolRebateConfBatchOpenOrClose(params: { ids: string; state: 1 | 2 })` — POST `/KolRebateConf/batchOpenOrClose`
  - `fetchKolRebateConfBatchDelete(params: { ids: string })` — POST `/KolRebateConf/batchDelete`
  验证：pnpm run typecheck 无报错

## 3. KOL申请列表页

- [x] 3.1 新建 `src/views/KolConfiguration/kol-invitation-list/Index.vue`，使用 `<script setup>`，结构：
  - `searchConf`：computed，2 个搜索项（邮箱 input + 阶梯费率 select，选项：全部/Level 1/Level 2/Level 3/Other，值 null/1/2/3/4）
  - `columns`：computed，10 列（ID fixed left + 邮箱/阶梯费率/等级其他/社区人数/联系人/联系电话/其它说明/创建时间/修改时间）
  - `apiFetch`：调用 `fetchGetKOLInvitationList`，用 `buildTableFetchResult` 适配
  - `exportConfig`：调用 `kolApplyExport`，buttonKey `invitationList:export`
  - `useOnActivated` 刷新
  验证：页面可打开，列表数据正常加载，搜索/重置/导出按钮行为正确

## 4. KOL开卡配置弹窗

- [x] 4.1 新建 `src/views/KolConfiguration/kol-opening-config/modal/OpenConfigFormModal.vue`，Drawer 宽度 480px，props：`visible`、`type: 'add' | 'edit'`、`activeData`
  - 表单字段：合伙人用户UID（新增必填，编辑禁用）、卡费范围 radio（全部用户=1 / 指定用户=3，编辑禁用）、邮箱 input（rebateRange=3 时显示，支持多邮箱逗号分隔格式校验）、开卡费 input（数字+两位小数校验，suffix: USDT）
  - UID blur 时调用 `fetchgetAccountId`，在输入框下方展示 `email` 或 `globalCode-phone`，失败时清空
  - 提交调用 `fetchgetOpenConfigAddOrUpdate`，成功 emit `success`，关闭 emit `close`
  - 编辑时 watch visible 回填 activeData
  验证：新增/编辑 Drawer 打开，UID 查询回显，表单校验，提交成功后列表刷新

## 5. KOL开卡配置列表页

- [x] 5.1 新建 `src/views/KolConfiguration/kol-opening-config/Index.vue`，使用 `<script setup>`，结构：
  - `searchConf`：合伙人用户UID input
  - `columns`：合伙人用户UID / 卡费范围 / 卡类型 / 渠道名称 / 用户(email) / 开卡费 / 创建时间 / 修改时间 / 操作列（编辑，buttonKey `agentCardOpeningConfiguration:edit`）
  - `apiFetch`：调用 `fetchgetOpenConfigList`，`buildTableFetchResult` 适配
  - `toolbarButtons`：新增按钮（buttonKey `agentCardOpeningConfiguration:add`）
  - `useOnActivated` 刷新，OpenConfigFormModal v-if 控制
  验证：列表正常加载，新增/编辑 Drawer 功能正确

## 6. 返佣业务配置弹窗

- [x] 6.1 确认 `featgetDitchInfo` 所在 API 文件，在返佣弹窗中 import 使用（不重复封装）
  > `fetchDitchInfoList` 已封装在 `src/api/kolConfiguration/index.ts`，由列表页 onMounted 加载，传入弹窗

- [x] 6.2 新建 `src/views/KolConfiguration/kol-rebate-config/modal/RebateConfigFormModal.vue`，Drawer 宽度 480px，props：`visible`、`type: 'add' | 'edit'`、`activeData`、`ditchInfoList`
  - 表单字段：业务类型 select（开卡/充值，编辑禁用）、卡片名称 select（options 来自 ditchInfoList，编辑禁用）、返佣范围 radio（全局=1/用户=3，编辑禁用）、返佣范围值 input（range=3 时显示，输入用户UID）、返佣比例 input（0-100，两位小数，suffix %）、生效时间范围选择器（转时间戳）、状态 radio（启用/关闭）
  - 提交调用 `fetchGetKolRebateConfAddOrUpdate`，时间拆分为 startTime/endTime
  - watch visible 回填数据，rebateRange=2 时 rebateRangeValue 转数组
  - 成功 emit `success`，关闭 emit `close`
  验证：新增/编辑 Drawer，卡片名称下拉有数据，表单校验，提交成功

## 7. 返佣业务配置列表页

- [x] 7.1 新建 `src/views/KolConfiguration/kol-rebate-config/Index.vue`，使用 `<script setup>`，结构：
  - `searchConf`：业务类型 select / 卡片类型 select / 生效时间范围 / 状态 select / 渠道名称 select（接口 options）/ 卡片名称 select（接口 options）/ 合伙人用户UID input
  - `columns`：ID(fixed left) / 业务类型 / 卡片类型 / 渠道名称 / 卡片名称 / 返佣比例% / 返佣范围 / 范围详情 / 起始时间 / 结束时间 / 更新时间 / 状态（cellPreset statusText kolRebateState）/ 操作列（编辑 buttonKey `rebateBusinessConfiguration:edit`、启用/停用切换）
  - 批量操作：`selectedIds` ref + `rowSelection` prop 传 TableSearchWrap；toolbarButtons 包含：添加（buttonKey `rebateBusinessConfiguration:add`）、批量开启（buttonKey `rebateBusinessConfiguration:batchClose`，disabled 当 selectedIds 空或 state≠2）、批量关闭（buttonKey `rebateBusinessConfiguration:batchOpening`，disabled 当 selectedIds 空或 state≠1）、批量删除（buttonKey `rebateBusinessConfiguration:batchDeletion`，disabled 当 selectedIds 空或 state≠2）
  - 批量删除用 `useConfirmAction`
  - `getDitchInfo` 在 onMounted 时调用，结果存局部 ref，传给弹窗
  - `useOnActivated` 刷新
  验证：列表加载，渠道名称/卡片名称 select 有数据，行内启停，批量按钮禁用逻辑，批量删除确认弹窗，新增/编辑 Drawer

## 8. 路由注册

- [x] 8.1 在 `src/routes/permissionRoutes.ts` 中新增 `/kolConfiguration` 父路由及 3 个子路由：
  ```
  path: '/kolConfiguration'  meta: { title: 'KOL推广计划', role: 'kolConfiguration' }
    ├── rebateBusinessConfiguration  → kol-rebate-config/Index.vue
    ├── agentCardOpeningConfiguration → kol-opening-config/Index.vue
    └── invitationList               → kol-invitation-list/Index.vue
  ```
  验证：通过侧边菜单可正常进入三个页面

## 9. 自测验收

- [x] 9.1 运行 `pnpm run typecheck`，确认无新增 TS 错误
- [x] 9.2 运行 `pnpm exec eslint src/views/KolConfiguration src/api/kolConfiguration/index.ts src/enums/statusText.ts src/routes/permissionRoutes.ts`，确认无 ESLint 报错
  > 修复：kol-rebate-config actionButtons buttonKey 由 'rebateBusinessConfiguration:edit/enable' 改为 'edit'/'enable'；三个页面日期列加 sortable: { sorter: true }；buttonKey 规范同步写入 openspec/config.yaml 和 CLAUDE.md
- [ ] 9.3 KOL申请列表：列表加载 ✓ / 邮箱+阶梯费率搜索 ✓ / 分页 ✓ / 导出 ✓ / tabbar 切换搜索条件缓存 ✓
- [ ] 9.4 KOL开卡配置：列表加载 ✓ / UID搜索 ✓ / 新增 Drawer（UID查询回显/邮箱校验/开卡费校验/提交）✓ / 编辑 Drawer（禁用字段/回填）✓
- [ ] 9.5 返佣业务配置：列表加载 ✓ / 多条件搜索 ✓ / 渠道名称&卡片名称 select 数据加载 ✓ / 行内启停 ✓ / 批量按钮禁用逻辑 ✓ / 批量删除确认弹窗 ✓ / 新增/编辑 Drawer ✓
- [ ] 9.6 三个页面 tabbar 切换：切走再切回，搜索条件和列表保持缓存（keep-alive 正确）
- [ ] 9.7 侧边菜单重新点击：列表重新请求（useOnActivated 正确）
