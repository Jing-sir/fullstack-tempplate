## Context

KolConfiguration 模块共 3 个子页面、5 个 .vue 文件，全部使用旧技术栈（Ant Design Vue + defineComponent + 手写表格骨架）。新项目已存在 `src/api/kolConfiguration/index.ts`，但仅包含 KOL列表相关的 4 个方法，其余 10 个方法需要补充。

渠道卡列表（ditchInfoList）被两个弹窗复用，来自 channel API 的 `featgetDitchInfo({ state: 1 })`，需确认新项目 channel API 中已有此方法。

## Goals / Non-Goals

**Goals:**
- 3 个页面全部用 TableSearchWrap 重写，消除手写表格骨架
- 所有弹窗迁移到 `modal/` 子目录，统一用 Drawer（宽度 480px）
- API 补全并规范化（显式类型、export interface）
- 路由注册到 permissionRoutes.ts
- 批量删除改用 useConfirmAction

**Non-Goals:**
- 不修改后端接口协议
- `rebateRange=2（标签范围）` 在旧项目中已被注释掉，本次不实现，保留 radio 但不展示标签选择器

## Decisions

### 1. 弹窗统一改为 Drawer（宽度 480px）
旧项目用 `<a-modal>`，新项目规范要求新增/编辑默认用 Drawer。三个弹窗（开卡配置新增/编辑、返佣配置新增/编辑/查看）均改为 Drawer。

### 2. 批量操作不使用 TableSearchWrap 内建 rowSelection
返佣配置页的批量操作（批量开启/关闭/删除）及按钮禁用逻辑依赖 `selectedRowKeysIds` 和当前 `state` 筛选值，需通过 `toolbarButtons` 的 `disabled` 动态控制，rowSelection 通过 TableSearchWrap 的 `row-selection` prop 传入。

### 3. cardInventory store 依赖移除
旧项目返佣配置页通过 `useCardInventory` store 获取渠道名称列表。新项目不在 store 中存页面级数据，改为在页面 onMounted 时直接调用 channel API 获取，存入局部 `ref`。

### 4. API 文件组织
补全方法统一追加到 `src/api/kolConfiguration/index.ts`，类型定义统一 export 到同文件（不新建 types.d.ts），与新项目现有风格对齐。

### 5. 状态 preset
在 `src/enums/statusText.ts` 新增 `kolRebateState`：
```ts
kolRebateState: {
  1: { text: '已开启', color: 'green' },
  2: { text: '已关闭', color: 'red' },
}
```
返佣配置列表状态列用 `cellPreset.type='statusText', preset: 'kolRebateState'` 展示（替代旧项目 Switch 控件），启停操作移至 actionButtons。

### 6. KOLInvitationList 字段注意
旧项目 `KOLInvitationList` 接口类型与实际字段存在命名不一致（types.d.ts 沿用了 ParameterData 的字段，但实际列展示了 gradeName/gradeOther/communityNum/contact/contactPhone/repairRemark）。迁移时以列定义为准，类型定义补全实际字段。

## Risks / Trade-offs

- **渠道卡列表依赖**：若新项目 channel API 尚未迁移 `featgetDitchInfo`，两个弹窗的卡片名称下拉将无数据，需实现时验证。
- **批量操作按钮禁用逻辑**：批量开启/关闭的禁用依赖搜索表单的 `state` 字段当前值，TableSearchWrap 的 searchConf 是受控的，需通过 `toolbarButtons` 的 `disabled` 回调访问响应式的 `formState.state`。
