# 标准列表页模板

这是后台业务列表页的标准模板。大方向固定：

- 页面使用 `TableSearchWrap`
- API 继承 `Api`
- 路由写入 `src/routes/permissionRoutes.ts`
- 权限使用 `meta.role` + `buttonKey`
- 状态列使用 `statusText`
- UID / 编号 / 单号使用 `copyableText`，字段后面显示复制 icon，复制后提示成功/失败
- 行操作使用 `actionButtons`
- 工具栏按钮使用 `toolbarButtons`
- 弹窗/抽屉放页面目录 `modal/`
- 导出使用 `exportConfig`

文件说明：

| 文件 | 复制到哪里 |
| --- | --- |
| `Index.vue` | `src/views/<Module>/<feature-name>/Index.vue` |
| `modal/FormModal.vue` | `src/views/<Module>/<feature-name>/modal/FormModal.vue` |
| `api.ts` | `src/api/<url-prefix>.ts` 或对应前缀目录 |
| `route-snippet.ts` | 复制片段到 `src/routes/permissionRoutes.ts` |
| `status-preset-snippet.ts` | 需要新增状态 preset 时，按注释改 `src/enums/statusText.ts` |

新增路由前，先看 `ai-templates/routes/README.md`。大模块、小页面、详情/编辑隐藏页的写法不同，不能混用。

新增表格列前，先看 `ai-templates/table-cell-contract.md`。UID、编号、单号不能默认省略，必须使用复制 icon。
短字段、邮箱、时间、操作列按 `ai-templates/table-cell-contract.md` 的列宽分档设置，不要靠过大的 `scroll.x` 撑开表格。
公共 `TableSearchWrap` 已内置横向滚动策略：按 1920 设计，低于 1550 或列宽总和超过容器时自动开启横向滚动。

新增 Drawer、Dialog、确认弹窗、操作提示前，先看 `ai-templates/interaction-patterns.md`。

AI 替换清单：

- `Example` / `example` / `示例` 替换为真实业务名
- API URL 替换为真实后端路径
- 搜索字段、表格列、按钮、弹窗字段替换为真实需求
- `meta.role` 和 `buttonKey` 必须对齐后端权限配置
- 状态枚举必须按接口或旧项目确认，不允许猜
- UID、ID、编号、单号字段必须使用 `cellPreset: { type: 'copyableText' }`
- 如果状态列复用已有 preset，直接改 `Index.vue` 里的 `preset`
- 如果状态列要新增 preset，必须同时更新 `StatusPreset`、状态映射常量、`STATUS_PRESET_MAP`
