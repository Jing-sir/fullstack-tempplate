# 菜单与权限契约

这个文件说明 AI 新增菜单、路由、按钮权限时必须遵守的契约。

## 路由权限

- 业务页面必须写 `meta.requiresAuth: true`
- 业务页面必须写 `meta.role`
- `meta.role` 必须和后端菜单数据的 `component` 字段一致
- 权限接口加载成功但当前路由无权限时，跳转 `/error/no-permission`，不要跳 404
- 首页等公共工作台可以使用 `ignorePermission: true`，普通业务页不要使用
- 新路由只允许添加到 `src/routes/permissionRoutes.ts`
- 顶级菜单必须配置 `meta.icon`

## 按钮权限

- 工具栏按钮使用 `toolbarButtons`
- 行操作按钮使用 `cellPreset.type = 'actionButtons'`
- 按钮必须配置 `buttonKey`
- 优先使用动作名：`add`、`edit`、`delete`、`view`、`export`
- 如果后端权限不是动作名，必须以接口/后端菜单为准，不允许猜

## 菜单结构

- 顶级模块：只负责菜单分组和图标
- 子路由：负责具体页面
- 详情/新增/编辑独立路由必须设置 `isShow: true`，避免出现在侧边栏
- 所有顶级模块复用 `MainLayout`
- 一级大模块、二级页面、隐藏页面的标准写法见 `ai-templates/routes/README.md`
- 无权限页只提供“返回”和“回首页”，不提供权限重试入口

## AI 必须确认

新增页面前，AI 必须确认：

- 顶级菜单 role
- 页面 role
- 按钮 key
- 菜单标题
- 顶级菜单 icon
- 是否需要隐藏详情/编辑路由
