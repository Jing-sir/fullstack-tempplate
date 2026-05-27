# AI 黄金模板

这个目录保存“不会参与运行、不参与路由、不参与打包”的标准模板。

用途：

- 当业务模块被删除后，AI 仍然有固定样板可参考。
- 非前端同事不需要理解模板代码，只需要在 `AI_BEGINNER.md` 里填写业务信息。
- AI 新增页面时，必须优先参考这里，而不是凭记忆自造结构。

当前模板：

| 模板 | 用途 |
| --- | --- |
| `list-page/` | 标准后台列表页：路由、API、TableSearchWrap、导出、权限按钮、弹窗、状态 preset |
| `routes/` | 标准路由新增方式：一级大模块、二级页面、隐藏详情/编辑页 |
| `table-cell-contract.md` | 表格字段展示规则：UID/编号复制 icon、长文本、省略、状态列 |
| `interaction-patterns.md` | 交互规则：Drawer、Dialog/确认、Message 提示、父子打开关闭 |

使用规则：

1. 模板只能作为参考，不要直接加入路由。
2. 新业务页面复制模板后，按真实模块名、接口前缀、字段、权限 key 替换。
3. 字段、接口、状态枚举、权限 key 不确定时，AI 必须先查项目/旧项目/接口文档；查不到就问，不允许猜。
4. 完成后必须运行 `pnpm run typecheck`、`pnpm exec eslint <改动文件>`、`pnpm run ai:check`。
5. `pnpm run ai:check` 会拦截模板占位符遗留到 `src`，例如 `ExampleItem`、`exampleApi`、`exampleState`。
