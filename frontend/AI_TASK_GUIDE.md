# AI 前端任务派单指南

给 AI 和懂一点流程的人用。完全不懂前端的人优先看 `AI_BEGINNER.md`。

- 非前端同事：照着填业务信息，不需要懂 Vue、TypeScript、Arco。
- AI：按本文件和 `AGENTS.md` 执行，不许自造项目路线，不许猜业务契约。

目标：**人看得懂，AI 做得准，结果能验收。**

## 1. 怎么用

每次派任务按这个顺序：

1. 复制“通用开场提示词”。
2. 选择一个模板，把业务信息填进去。
3. AI 先输出“开工前确认”，确认后再写代码。
4. AI 最后按“交付格式”说明结果、验证命令和风险。

涉及 3 个及以上页面、批量迁移、整体重构、多个 API 文件或多个路由时，先走项目规定的 OpenSpec / 提案流程。

## 2. 通用开场提示词

```text
请先阅读 AGENTS.md、AI_BEGINNER.md 和 AI_TASK_GUIDE.md，并严格按本项目既定路线实现。

不要直接开始写代码。请先输出“开工前确认”：
1. 任务类型
2. 参考文件
3. 计划改动文件
4. 已确认信息
5. 需要确认的信息
6. 是否需要 OpenSpec / 提案流程
7. 计划运行的验证命令

我确认后，你再开始实现。
```

## 3. AI 开工前必须回答

```text
开工前确认：
- 任务类型：
- 参考文件：
- 计划改动文件：
- 已确认信息：
- 需要确认的信息：
- 是否需要 OpenSpec：
- 验证命令：
```

如果 AI 跳过这一步，先停下来重走流程。

## 4. 不能猜的内容

AI 不能凭感觉写：

- 接口 URL、请求方式、参数名、返回字段。
- 状态枚举值，例如 `0/1/2` 分别代表什么。
- 权限字段，例如 `meta.permissionKey`、`meta.permissionParent`、按钮 `buttonKey`。
- 路由 `name` 和后端菜单权限的对应关系。
- 旧项目迁移时的搜索字段、表格列、按钮、弹窗、接口。
- 金额、数量、ID、时间字段的特殊展示规则。

确认信息的优先级：

1. 用户本次明确给出的内容。
2. 当前项目同模块、同类型页面。
3. 当前项目 API、类型、路由、枚举文件。
4. 用户提供的旧项目源码或接口文档。
5. 仍找不到时，列为“需要确认”，不要猜。

影响接口、状态、权限、路由、资金金额展示的信息，如果无法确认，必须先问，不能继续编。

## 5. 项目路线硬规则

完整规则以 `AGENTS.md` 为准。这里是最重要的：

| 场景 | 必须这样做 | 禁止这样做 |
| --- | --- | --- |
| 列表页 | 使用 `TableSearchWrap` | 手写搜索区 + `a-table` + 分页 |
| 搜索配置 | `computed<SearchOption[]>` | 普通数组写死 |
| 表格列 | `computed<ColumnType[]>` | 模板里写复杂表达式 |
| 导出 | `exportConfig` | 页面手写导出按钮 |
| 工具栏按钮 | `toolbarButtons` | 自己写权限按钮区域 |
| 行操作按钮 | `cellPreset.type = 'actionButtons'` | 手写操作列 slot |
| UID/编号/单号 | `cellPreset.type = 'copyableText'`，后面展示复制 icon，复制后提示成功/失败 | 默认省略号、静默复制或手写复制 slot |
| 状态列 | `cellPreset.type = 'statusText'` | 页面里写状态 map |
| 标签列 | `cellPreset.type = 'labelTags'` | 手写 `a-tag` 循环 |
| API | 后端 URL 必须使用固定版本前缀 `/api/v{数字}`，例如 `/api/v1/login`；前端通过 `VITE_APP_BASE_URL=/api/v1` + API 方法路径 `/login` 拼出完整地址 | 写 `/api/login`、`/login` 直连后端、组件里直接 `axios` |
| API 模块 | 按 URL 前缀放 `src/api`，继承 `Api` | 组件里直接 `axios` |
| 弹窗/抽屉 | 页面目录 `modal/`，父页面 `v-if` 挂载 | 浮层混进 `components/` |
| 二次确认 | `useConfirmAction().confirmAndRun` | 每页手写 `Modal.confirm` |
| 操作提示 | `Message.success/error/warning(t('中文'))` | 静默成功或裸中文 |
| 路由 | 改 `src/routes/permissionRoutes.ts` | 写到页面或 setup |
| 文案 | `t('中文原文')`，同步语言包 | 英文语义 key 或裸中文 |
| 包管理 | `pnpm` | 切换其它包管理器 |

常用参考：

- 黄金模板目录：`ai-templates/`
- 标准列表页模板：`ai-templates/list-page/Index.vue`
- 标准 API 模板：`ai-templates/list-page/api.ts`
- 标准弹窗模板：`ai-templates/list-page/modal/FormModal.vue`
- 交互模式模板：`ai-templates/interaction-patterns.md`
- 标准路由模板：`ai-templates/routes/README.md`
- 菜单权限契约：`ai-templates/permission-contract.md`
- 表格字段展示契约：`ai-templates/table-cell-contract.md`
- 标准列表页：`src/views/AssetManage/user-asset-list/Index.vue`
- 简单列表页：`src/views/AddressList/Index.vue`
- 公共列表组件：`src/components/TableSearchWrap/Index.vue`
- 表格类型：`src/interface/TableType.ts`
- API 写法：`src/api/userApi/asset/index.ts`
- 路由写法：`src/routes/permissionRoutes.ts`
- 确认操作：`src/use/useConfirmAction.ts`
- 状态 preset：`src/enums/statusText.ts`

## 6. 字段怎么填

搜索字段：

| 名称 | 参数名 | 类型 | 选项来源 | 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 用户UID | userId | input | 无 | 无 | 请输入用户UID |
| 状态 | state | select | 1=正常，2=冻结 | 无 | 不确定就写待确认 |

表格列：

| 标题 | 字段名 | 类型 | 宽度 | 特殊处理 |
| --- | --- | --- | --- | --- |
| 创建时间 | createTime | 时间 | 160 | 无 |
| 用户UID | userId | 普通 | 按项目规则 | 无 |
| 状态 | state | 状态 | 按项目规则 | 1=正常，2=冻结 |

操作按钮：

| 名称 | 位置 | buttonKey | 点击行为 | 是否二次确认 | 成功后动作 |
| --- | --- | --- | --- | --- | --- |
| 冻结 | 行操作 | freeze / 待确认 | 打开冻结弹窗 | 是 | 刷新列表 |

注意：

- 时间列宽度至少 160。
- 状态列必须写清枚举含义。
- UID、ID、编号、单号、订单号字段不能默认省略，必须使用复制 icon，并且复制后要有成功/失败反馈。
- 短字段列宽按 `ai-templates/table-cell-contract.md` 分档处理，避免邮箱过宽、区号换行这类问题。
- 表格按 1920 宽屏设计；低于 1550 或列宽总和超过容器时，由 `TableSearchWrap` 自动开启横向滚动。
- `buttonKey` 不确定时写“待确认”，不要让 AI 猜。
- ID 字段如果名字里带 `asset`、`balance`、`amount` 等词，提醒 AI 加 `amountFormat: false`。

## 7. 模板：列表页

适用于新增列表页、修改列表页。

```text
任务类型：新增列表页 / 修改列表页
页面路径：
所属模块：
参考页面：

路由信息（新增页面才填）：
- path：
- name：
- meta.title：
- meta.permissionKey：
- meta.permissionParent：
- 顶级菜单 icon：

接口信息：
- 列表接口 URL：
- 请求方式：
- 导出接口 URL：
- 其它操作接口：

搜索字段：
| 名称 | 参数名 | 类型 | 选项来源 | 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |

表格列：
| 标题 | 字段名 | 类型 | 宽度 | 特殊处理 |
| --- | --- | --- | --- | --- |

操作按钮：
| 名称 | 位置 | buttonKey | 点击行为 | 是否二次确认 | 成功后动作 |
| --- | --- | --- | --- | --- | --- |

弹窗/详情：
- 是否需要：
- 字段：
- 提交接口：

验收标准：
- 页面上应该看到什么：
- 点击后应该发生什么：
```

## 8. 模板：弹窗 / API / 路由

```text
任务类型：新增或修改弹窗 / 新增或修改 API / 新增路由

所属页面：
目标文件：
参考文件：

弹窗信息（没有就写无）：
- 弹窗名称：
- 类型：a-modal / a-drawer
- 打开入口：
- 表单字段：
- 提交接口：
- 成功后动作：

API 信息（没有就写无）：
- URL：
- 请求方式：
- 请求参数：
- 返回字段：
- 调用页面：

路由信息（没有就写无）：
- path：
- name：
- component：
- meta.title：
- meta.permissionKey：
- meta.permissionParent：
- 顶级菜单 icon：

验收标准：
- 
```

## 9. 模板：迁移旧页面

```text
任务类型：迁移旧页面
旧项目页面路径：
新项目目标路径：
参考的新项目页面：

必须逐项对照：
1. 旧页面所有搜索字段
2. 旧页面所有表格列
3. 旧页面所有操作按钮
4. 旧页面所有弹窗/抽屉/详情页
5. 旧页面所有接口 URL、方法、参数
6. 旧页面所有状态枚举值和文案
7. 旧页面所有权限点

要求：
- 先输出字段对照表。
- 标记无法确认的字段。
- 确认后再实现。
```

## 10. 模板：修 bug

```text
任务类型：修 bug
问题现象：
复现步骤：
期望结果：
实际结果：
相关页面路径：
相关接口：
错误信息：
最近是否改过相关代码：

要求：
1. 先定位原因，不要直接猜修复。
2. 说明问题属于：接口参数 / 返回字段 / 权限 / 路由 / 表格配置 / i18n / 样式 / 其它。
3. 修复后运行必要验证命令。
4. 最后说明根因和修复点。
```

## 11. 最终交付格式

```text
完成内容：
- 

修改文件：
- 

接口和字段确认：
- 已确认：
- 仍需人工确认：

验证结果：
- pnpm run typecheck：通过 / 未通过 / 未运行，原因：
- pnpm exec eslint <改动文件>：通过 / 未通过 / 未运行，原因：
- pnpm run ai:check：通过 / 未通过 / 未运行，原因：

业务验收点：
- 

风险说明：
- 无 / 有：
```

没有验证命令结果，就不能说”通过”。

## 13. 自测要求（强制）

**每次实现新功能或修改已有接口后，必须端到端自测所有改动点**，包括：

1. `pnpm run typecheck` 通过 —— 没有类型错误
2. `pnpm exec eslint <改动文件>` 通过 —— 没有 lint 警告
3. 启动后端后，在浏览器或 curl 验证：
   - 列表页能正常加载数据（接口返回 `{list, total}` 结构）
   - 新增/编辑提交后列表刷新、数据落盘
   - 删除后数据消失
   - 状态切换后开关状态一致
4. API 文件新增方法时，对应页面调用路径要跑通（不能仅靠 typecheck）
5. 操作日志等中间件要验证数据库有记录（`total > 0`）

## 12. 验收时只看这些

- AI 是否先输出“开工前确认”。
- 是否写清参考文件和改动文件。
- 是否列出不确定的接口、枚举、权限点。
- 页面是否出现要求的搜索字段、表格列、按钮、弹窗。
- 搜索参数、按钮行为、成功提示是否符合业务预期。
- 是否运行 `pnpm run typecheck`。
- 是否运行 `pnpm exec eslint <改动文件>`。
- 没运行验证时，是否说明明确原因。
- 是否运行 `pnpm run ai:check`，确认没有明显违反项目架构路线。
