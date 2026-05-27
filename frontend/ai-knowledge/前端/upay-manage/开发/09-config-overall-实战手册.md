# 09 config-overall 实战手册

## 用途

这份文档不是重复介绍 `config-overall` 的目录结构，而是说明：

- 新页面落地时，通常按什么顺序搭
- 哪些文件是必选，哪些是按需
- 哪些真实页面可以作为直接参考

## 一条标准新页面的落地顺序

建议按下面顺序实现：

1. 先确认这是 `new-surface`
2. 在 `src/routes/*` 里补路由
3. 新建 `src/views/<Domain>/<Page>/index.vue`
4. 新建 `config/query-item.ts`
5. 新建 `config/table-config.ts`
6. 如果有新增 / 编辑 / 详情弹层，再补 `config/update/*`
7. 如果有 tabs，再补 `config/tabs-pange.ts`
8. 如果有统计区，再在 `query-item.ts` 里补 `statistics`
9. 把接口统一接到 `src/api/*`
10. 最后再补局部插槽和跨菜单权限判断

## 哪些文件通常是必选

最常见的最小集合是：

```text
index.vue
config/query-item.ts
config/table-config.ts
```

如果页面只是标准查询表格页，这三份通常就能起起来。

## 哪些文件是按需补

### 有新增 / 编辑 / 详情弹层

按需补：

- `config/update/*`
- 或者页面内单独的 `Modal/AddOrEdit.vue`

### 有 tabs

按需补：

- `config/tabs-pange.ts`

### 有特殊下拉或远程选项

按需补：

- `config/options.ts`
- 或在 `query-item.ts` 里异步更新 `construction[].options`

### 有大量查询项复用

按需补：

- `config/construction.ts`

## 最应该参考的现有样本

### 标准查询表格页

- `src/views/AcquiringManagement/ExchangeRateSettings/`

特点：

- `index.vue` 很薄
- 查询与表格配置拆开
- 局部操作通过插槽处理

### 带 tabs 的 `config-overall` 页面

- `src/views/Billing/ClearingManagement/`

特点：

- `query-item.ts` 里挂 `tabsPangeConfig`
- `tabs-pange.ts` 里每个 tab 都有自己的 `activeConstring`
- tab 级别可以带不同查询接口和导出按钮

### 配置复杂、插槽很多的页面

- `src/views/OperationsManage/DiscountCode/`

特点：

- `config-index` + `update-data` 深度结合
- 使用了大量 `customDataIndex`、`operate`、`infoSlots`、`itemUpdata`
- 同时混合了业务弹窗、详情、推广等复杂流程

## index.vue 的职责边界

项目里好的 `config-overall` 页面通常让 `index.vue` 只做这些事：

- 挂 `<config-index ref="configRef">`
- 暴露必要的 slot
- 处理局部跳转或局部弹窗引用
- 在 `onActivated` 时调用 `SetConfigFrom`

不建议在 `index.vue` 里塞太多：

- 复杂查询项组装
- 大量表格头定义
- 大段样式逻辑

## query-item.ts 重点

`query-item.ts` 通常至少要定义：

- `construction`
- `btns.queryBtns.handelSubmit`
- `tabelConfig`
- `formState`

如果页面有导出，要在这里补：

- `btns.exportBtns.show`
- `btns.exportBtns.handExport`
- `btns.exportBtns.exportFileTitle`
- `btns.exportBtns.buttonPermissions`

## tabs 页面重点

如果页面是 tabs 结构，注意两层配置：

- 页面主配置 `tabsPangeConfig`
- 每个 tab 自己的 `activeConstring`

`activeConstring` 里通常还要再配：

- tab 自己的 `construction`
- tab 自己的 `tabelConfig`
- tab 自己的 `queryBtns`
- tab 自己的 `exportBtns`

## 列表接口返回格式

`config-index.vue` 的表格流默认依赖这几个字段：

- `list`
- `totalSize`
- `pageNo`
- `pageSize`

如果你的接口不返回这个结构，优先在业务 API 层做适配。

## 详情与隐藏路由

项目里 detail 页面有两种常见方式：

- 作为当前页弹层，用 `update-data` 或局部 `Modal`
- 作为独立子路由，但通常带 `isShow: true`

例如某些详情路由不会在左侧菜单里独立展示，但仍然是独立路由页面。

## Tailwind 与样式

当前项目规则要求：

- 新增样式优先 Tailwind
- `config-overall` 页面的新增视觉样式尽量放在模板 class 上解决
- 不要为了一个新页面再加大段新的 SCSS

## 实战建议

- 新页优先从兄弟 `config-overall` 页面复制骨架
- 其次再用 `skills/upay-manage/assets/templates/` 下的模板资源
- 先跑通查询列表，再接导出、详情、弹层
- 权限不清楚时先确认当前是 `buttonPermissions()` 还是 `isMoreRoleBtn()`
