# Proposal: 资产管理模块二次迁移

## What & Why

资产管理模块（`src/views/AssetManage/`）在首次迁移时遗漏了若干功能细节，导致按钮权限不生效、破坏性操作未走规范二次确认、弹窗回填失效等问题。本次通过逐文件对比旧项目（`/Desktop/company/new-upay-admin/src/views/Asset/`）与新项目，系统修复所有细节缺失。

## 旧项目文件清单（11个）

| 旧项目文件 | 对应新项目文件 |
|---|---|
| Asset/AssetList.vue | AssetManage/agent-asset-list/Index.vue |
| Asset/AssetListModal.vue | AssetManage/agent-asset-list/modal/AgentAssetActionModal.vue |
| Asset/UserAssetList.vue | AssetManage/user-asset-list/Index.vue |
| Asset/UserListMoadl.vue | AssetManage/user-asset-list/modal/UserAssetFreezeModal.vue |
| Asset/AssetFreeze.vue | AssetManage/user-asset-freeze/Index.vue |
| Asset/components/AssetFreezeMoadl.vue | AssetManage/user-asset-freeze/modal/UserAssetThawModal.vue |
| Asset/AssetFreezeHistory.vue | AssetManage/user-asset-freeze-history/Index.vue |
| Asset/Transfer.vue | AssetManage/asset-transfer-record/Index.vue |
| Asset/userAssetsJournal.vue | AssetManage/user-asset-journal/Index.vue |
| Asset/UserFiatAsset/index.vue | AssetManage/user-fiat-asset/Index.vue |
| Asset/UserFiatAssetJournal/index.vue | AssetManage/user-fiat-asset-journal/Index.vue |

## 缺失/错误功能清单

### 1. buttonKey 格式错误（影响全部 6 个有按钮的文件）
所有按钮均使用 `routeName:action` 格式，应改为仅 `action` 名（如 `freeze`、`export`、`snapshot`）。
受影响文件：agent-asset-list、user-asset-list、user-asset-freeze、asset-transfer-record、user-asset-journal、user-fiat-asset、user-fiat-asset-journal

### 2. 破坏性操作未用 useConfirmAction
- `user-asset-list/Index.vue`：`handleToggleShowMinus`（展示/不展示负资产）用内联 `Modal.confirm`，应改为 `useConfirmAction`

### 3. 弹窗 watch 缺少 `{ immediate: true }`
三个弹窗均使用 `v-if` 控制挂载，挂载时 visible 已是 true，watch 不会触发：
- `AgentAssetActionModal.vue`
- `UserAssetFreezeModal.vue`
- `UserAssetThawModal.vue`

### 4. AgentAssetActionModal 中 try/finally 未改为 .finally()
`handleSubmit` 仍使用 `try/finally` 模式重置 loading，需改为 `.finally()` 链式。

## Non-goals

- 不迁移旧项目 `SAgentChoose`、`SCoin`、`SLabelIds` 等旧组件 — 已用 input/select 替代，功能等价
- 不迁移已注释的旧项目功能（冻结历史导出、info modal 等）
- 不迁移 `AssetMonitoring`、`AssetSnapshot`、`DigitAsset` 等其他大模块

## 依赖关系

- 所有修改均在已有文件内，无需新建文件
- 无新增 API、无新增 statusText preset
