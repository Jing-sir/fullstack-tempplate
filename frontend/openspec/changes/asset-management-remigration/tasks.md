# Tasks: 资产管理模块二次迁移

## 1. buttonKey 修复 — agent-asset-list/Index.vue

- [x] 1.1 将 `agentAssetList:freeze` → `freeze`，`agentAssetList:unFreezze` → `unFreezze`，`agentAssetList:transfer` → `transfer`，`agentAssetList:snapshot` → `snapshot`，exportConfig.buttonKey `agentAssetList:export` → `export`
  验证：文件中无 `agentAssetList:` 前缀残留

## 2. buttonKey 修复 — user-asset-list/Index.vue

- [x] 2.1 将 `userAssetList:detail` → `detail`，`userAssetList:freeze` → `freeze`，`userAssetList:DisplayNegativeAssets` → `DisplayNegativeAssets`，`userAssetList:snapshot` → `snapshot`，exportConfig.buttonKey `userAssetList:export` → `export`
  验证：文件中无 `userAssetList:` 前缀残留

## 3. buttonKey 修复 — 其余 5 个文件

- [x] 3.1 `user-asset-freeze/Index.vue`：`userAssetFreeze:unfreeze` → `unfreeze`
- [x] 3.2 `asset-transfer-record/Index.vue`：`transfer:export` → `export`
- [x] 3.3 `user-asset-journal/Index.vue`：`userAssetsJournal:export` → `export`
- [x] 3.4 `user-fiat-asset/Index.vue`：`userFiatAsset:export` → `export`
- [x] 3.5 `user-fiat-asset-journal/Index.vue`：`userFiatAssetJournal:export` → `export`
  验证：上述文件中无 `:` 分隔的 routeName 前缀残留

## 4. handleToggleShowMinus 改用 useConfirmAction

- [x] 4.1 在 `user-asset-list/Index.vue` 中：
  - import `useConfirmAction`，注入 `confirmAndRun`
  - 将内联 `Modal.confirm(...)` 改为 `confirmAndRun({ content: ..., onOk: async () => {...} })`
  - 若 `Modal` import 不再使用则移除
  验证：文件中无 `Modal.confirm` 调用，操作后弹出确认弹窗

## 5. 弹窗 watch 加 `{ immediate: true }`

- [x] 5.1 `AgentAssetActionModal.vue`：watch 末尾加 `, { immediate: true }`
- [x] 5.2 `UserAssetFreezeModal.vue`：watch 末尾加 `, { immediate: true }`
- [x] 5.3 `UserAssetThawModal.vue`：watch 末尾加 `, { immediate: true }`
  验证：编辑打开弹窗后表单字段有数据回填

## 6. AgentAssetActionModal try/finally → .finally()

- [x] 6.1 `AgentAssetActionModal.vue`：`handleSubmit` 中 `try { await api } finally { submitting=false }` 改为 `await api(...).finally(() => { submitting.value = false })`
  验证：提交成功/失败后 loading 正常复位，代码无 try/finally

## 7. 自测验收

- [x] 7.1 `pnpm run typecheck` 无新增 TS 错误
- [x] 7.2 `pnpm exec eslint src/views/AssetManage` 无报错
- [ ] 7.3 代理商资产：冻结/解冻/划转按钮可见，操作弹窗打开时数据已回填，提交成功
- [ ] 7.4 用户资产：详情/冻结/负资产切换按钮可见，负资产切换有确认弹窗
- [ ] 7.5 用户资产冻结：解冻按钮可见，解冻弹窗打开时数据已回填
