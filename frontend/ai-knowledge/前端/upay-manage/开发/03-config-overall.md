# 03 config-overall

## 什么时候用

在本项目里，`config-overall` 主要用于新增的 route-level 页面，也就是：

- 新增独立路由
- 新增独立菜单页
- 新增完整的查询 / 表格 / 新增 / 编辑 / 详情页

如果只是给已有页面加一个弹窗、抽屉、按钮、tab，不算新的 `config-overall` 页面。

## 核心入口

公共能力都集中在 `src/config-overall/` 下，最重要的文件包括：

- `src/config-overall/views/config-index.vue`
- `src/config-overall/interface/index.ts`
- `src/config-overall/views/components/query/*`
- `src/config-overall/views/components/table/*`
- `src/config-overall/views/components/update-data/*`
- `src/config-overall/hook/*`

## 页面结构的真实样子

一个标准的 `config-overall` 页面通常会长成这样：

```text
src/views/<Domain>/<Page>/index.vue
src/views/<Domain>/<Page>/config/query-item.ts
src/views/<Domain>/<Page>/config/table-config.ts
src/views/<Domain>/<Page>/config/update/*
src/views/<Domain>/<Page>/config/options.ts
src/views/<Domain>/<Page>/config/tabs-pange.ts
src/views/<Domain>/<Page>/config/construction.ts
```

不是每个页面都会把所有文件都配齐，但目录思路基本是这个方向。

## 代表样本

`src/views/AcquiringManagement/ExchangeRateSettings/` 是一个典型样本：

- `index.vue`
- `config/query-item.ts`
- `config/table-config.ts`
- `Modal/AddOrEdit.vue`

这个页面的 `index.vue` 很薄，主要职责只有：

- 渲染 `<config-index ref="configRef">`
- 暴露 `addBtn`、`operate`、`customDataIndex` 这些插槽
- 管理局部弹窗 `AddOrEdit`
- 在 `onActivated` 时调用 `SetConfigFrom`

## config-index.vue 负责什么

`src/config-overall/views/config-index.vue` 实际上把标准后台页拆成了几层：

- tabs
- 查询表单
- 查询按钮区
- 统计区
- 表格区
- 新增 / 编辑 / 详情弹层

也就是说，业务页不应该把这些能力重复手写一遍，而是把业务差异塞回配置对象或插槽里。

## ConstructionFrom 是主配置协议

`src/config-overall/interface/index.ts` 里的 `ConstructionFrom` 是核心配置类型，常用字段包括：

- `construction`
  - 查询表单项配置
- `btns`
  - 查询、新增、编辑、详情、导出等按钮行为
- `tabelConfig`
  - 表格头、滚动、定制渲染字段
- `statistics`
  - 统计区配置
- `tabsPangeConfig`
  - 多 tab 页面配置
- `formState`
  - 查询表单默认值

## 典型配置拆分

### query-item.ts

一般负责：

- 查询项 `construction`
- 查询接口 `btns.queryBtns.handelSubmit`
- 页面默认表单值 `formState`
- 基础按钮配置
- 表格引用 `tabelConfig`

### table-config.ts

一般负责：

- 表头 `headers`
- 宽度、固定列、字段名

### update/*

一般负责：

- 新增 / 编辑 / 详情弹窗的数据结构
- 表单字段定义
- 提交逻辑

## 查询接口返回格式约定

`config-index.vue` 内部默认认为查询接口会返回：

- `list`
- `totalSize`
- `pageSize`
- `pageNo`

如果你的接口返回格式和这个不一致，就要先在业务层适配，不要直接把公共层打穿。

## 常见插槽

`config-overall` 页面里常用的业务插槽包括：

- `addBtn`
- `operate`
- `customDataIndex`
- `itemUpdata`
- `infoSlots`
- `footer`

这些插槽通常用来处理：

- 额外操作按钮
- 特殊字段显示
- 局部定制弹窗内容

## 实际开发建议

- `index.vue` 尽量保持薄，只做页面壳和局部插槽拼装
- 查询条件、表格头、更新表单尽量拆到 `config/*`
- 尽量复用已有同业务域页面的命名和结构
- 如果同目录下已有 `tabs-pange.ts`、`options.ts`、`construction.ts`，优先延续同样拆分方式

## 常见误区

### 把大量业务逻辑重新写回 index.vue

这样会直接破坏 `config-overall` 的意义，后续难维护。

### 明明是新增页面，却继续沿用老页面随手手写

这会在同一业务域里再造第三种风格，后续成本更高。

### 不看同目录兄弟页面，自己发明字段结构

在这个项目里，同目录兄弟模块的一致性比抽象上的“最佳实践”更重要。
