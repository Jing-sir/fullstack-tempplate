# Design: 资产管理模块二次迁移

## Context

资产管理 8 个页面 + 3 个弹窗已存在于 `src/views/AssetManage/`，首次迁移时遗留 4 类问题。本次只做点修补，无架构变动，无新增文件。

## 修复方案

### 1. buttonKey 格式统一

**当前问题**：所有按钮用 `routeName:action` 格式（如 `agentAssetList:freeze`）。  
**修复方式**：改为仅 `action`（如 `freeze`）。PermissionButton 组件新匹配策略会自动拼 `${route.name}-${buttonKey}`，后端权限配置格式为 `${routeName}-${buttonKey}`。

需改动的文件和 buttonKey：

| 文件 | 旧 buttonKey → 新 buttonKey |
|---|---|
| agent-asset-list/Index.vue | `agentAssetList:freeze` → `freeze` |
| agent-asset-list/Index.vue | `agentAssetList:unFreezze` → `unFreezze`（保留原拼写，与后端配置一致） |
| agent-asset-list/Index.vue | `agentAssetList:transfer` → `transfer` |
| agent-asset-list/Index.vue | `agentAssetList:snapshot` → `snapshot` |
| agent-asset-list/Index.vue | `agentAssetList:export` → `export`（exportConfig.buttonKey） |
| user-asset-list/Index.vue | `userAssetList:detail` → `detail` |
| user-asset-list/Index.vue | `userAssetList:freeze` → `freeze` |
| user-asset-list/Index.vue | `userAssetList:DisplayNegativeAssets` → `DisplayNegativeAssets` |
| user-asset-list/Index.vue | `userAssetList:snapshot` → `snapshot` |
| user-asset-list/Index.vue | `userAssetList:export` → `export` |
| user-asset-freeze/Index.vue | `userAssetFreeze:unfreeze` → `unfreeze` |
| asset-transfer-record/Index.vue | `transfer:export` → `export` |
| user-asset-journal/Index.vue | `userAssetsJournal:export` → `export` |
| user-fiat-asset/Index.vue | `userFiatAsset:export` → `export` |
| user-fiat-asset-journal/Index.vue | `userFiatAssetJournal:export` → `export` |

### 2. handleToggleShowMinus 改用 useConfirmAction

**文件**：`user-asset-list/Index.vue`  
**当前**：直接用 `Modal.confirm({...})` 内联  
**修复**：
```ts
import useConfirmAction from '@/use/useConfirmAction'
const { confirmAndRun } = useConfirmAction()

const handleToggleShowMinus = (record: UserAssetItem) => {
    const isShow = record.showMinusAccount === 1
    confirmAndRun({
        content: t(isShow ? '确认关闭负资产展示吗？' : '确认开启负资产展示吗？'),
        onOk: async () => {
            await assetApi.updateUserAssetStatus({ id: record.id, showMinusAccount: isShow ? 2 : 1 })
            Message.success(t('操作成功'))
            handleRefresh()
        },
    })
}
```
同时移除 `Modal` import（若不再使用）。

### 3. 弹窗 watch 加 `{ immediate: true }`

**原因**：父组件用 `v-if="modalVisible"` 控制挂载，弹窗挂载时 `visible` prop 已是 `true`，watch 不会捕获 `false→true` 的变化。加 `immediate: true` 后挂载即执行回填。

三个文件均在 watch 末尾加 `{ immediate: true }`：
- `AgentAssetActionModal.vue`（watch 在第 108 行附近）
- `UserAssetFreezeModal.vue`（watch 在第 92 行附近）
- `UserAssetThawModal.vue`（watch 在第 84 行附近）

### 4. AgentAssetActionModal try/finally → .finally()

**文件**：`agent-asset-list/modal/AgentAssetActionModal.vue`  
**当前**：`handleSubmit` 用 `try { await api } finally { submitting.value = false }`  
**修复**：改为 `await api(...).finally(() => { submitting.value = false })`，后续的 `Message.success`、`emit('success')`、`close()` 保持顺序不变。
