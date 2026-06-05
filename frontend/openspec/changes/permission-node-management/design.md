## Context

当前权限体系已经具备统一 `menus` 树、`menus.type`、角色授权、页面子权限加载和后端 `RequireAnyPermission` 安全边界。缺口在于权限节点管理体验尚未闭环：已有 `/admin/menus` 基础 CRUD，但角色授权页没有提供完整节点维护入口，写接口也没有强制 2FA。

本设计把“权限字典维护”和“角色授权”分开：角色授权页仍负责勾选权限；权限节点管理 UI 负责维护权限树本身。两者共享同一份 `menus` 树。

## Goals / Non-Goals

**Goals:**

- 管理员可在界面中维护任意权限节点：目录、列表页、隐藏页、按钮、Tab。
- 支持新增根节点和新增子节点。
- 支持编辑节点基础信息、移动父级、调整排序、启停、删除。
- 所有写操作后端必须校验当前操作者 2FA。
- 权限节点变更后，角色授权树和当前用户权限缓存及时刷新。
- 保持 API 路径参数只出现在 URL 最后一个片段。

**Non-Goals:**

- 不自动生成业务代码。
- 不改变现有角色权限勾选 `check-strictly` 行为。
- 不允许前端本地伪造权限节点参与授权。

## Decisions

### 1. 权限节点仍复用 menus 表

继续使用 `menus` 表表达权限节点：

```text
type=1 目录/模块
type=2 列表页/菜单页
type=3 隐藏业务页
type=4 按钮/操作
type=5 页面内 Tab
```

前端表单字段先对齐现有 schema：

```text
id
parent_id
name
title
type
icon
sort
status
```

### 2. 角色授权页只增加管理入口

`role-permissions/form/Index.vue` 当前主流程是角色授权。为避免用户把“勾选角色权限”和“维护权限字典”混淆，页面仅新增一个 `管理权限节点` 按钮：

- 仅 `sidebarStore.hasPermission("rolePermissions-menuManage")` 为 true 时显示。
- 点击后打开全屏或大尺寸 Drawer。
- Drawer 内维护完整权限树，保存后通知父页面重新调用 `sysRoleMenuList()`。

### 3. 权限节点管理 UI 使用树 + 详情面板

推荐布局：

```text
左侧：完整权限树 + 搜索 + 类型筛选
右侧：当前节点详情 + 子节点列表 + 操作按钮
底部：刷新 / 关闭
```

节点操作：

- 新增根节点
- 新增子权限
- 编辑
- 启用/禁用
- 删除
- 上移/下移或直接编辑 sort
- 移动父级

所有新增/编辑类表单必须展示 2FA 输入框；删除、启停、移动排序使用确认弹窗并要求输入 2FA。

### 4. 后端必须强制 2FA

写接口请求体统一包含：

```json
{
  "facode": "123456"
}
```

后端 Handler SHALL 在调用 `MenuService` 写入前校验：

- 当前用户已登录。
- 当前用户已绑定 2FA。
- `facode` 与当前用户 TOTP secret 匹配。

校验失败 SHALL 返回 400，且不得执行任何数据写入。

实现建议：

- 在 `UserService` 增加 `ValidateCurrentTwoFA(ctx, adminUserID, facode)` 或等价方法。
- `MenuHandler` 写接口调用该方法。
- 不复用“密码 + 2FA”校验接口，避免权限维护表单要求输入登录密码。

### 5. 父子类型约束由后端兜底

前端可动态禁用不合法父级选择，但最终以后端为准：

```text
目录：根节点或目录下
列表页：目录下
隐藏页：列表页下
按钮：列表页或 Tab 下
Tab：列表页或 Tab 下
```

移动父级和编辑类型也必须走同一套校验，禁止循环父链。

### 6. 删除采用显式策略

删除请求体包含：

```json
{
  "facode": "123456",
  "cascade": false
}
```

规则：

- 节点存在子节点且 `cascade=false` 时返回 400。
- `cascade=true` 时删除整棵子树，并清理 `role_menus` 关联。
- 删除成功后递增受影响用户 `permission_version`。
- 若后续需要保护系统内置权限，可增加后端保护名单或 `is_system` 字段；本次先不新增字段。

### 7. 权限版本刷新

权限节点变更会影响角色授权树和用户可见权限。后端写操作成功后 SHALL 递增受影响用户 `permission_version`。

实现允许两种方式：

- 精确更新：根据受影响 `menu_id` / 子树反查 `role_menus` 和用户。
- 保守更新：菜单字典变更后递增所有管理员 `permission_version`。

前端收到新的 `X-Permission-Version` 后继续复用现有 `sidebarStore.refreshPermissions()`。

### 8. 超级管理员授权策略

新增权限节点后：

- 若新增节点是系统管理类权限，可自动授权给 `superadmin` 角色。
- 普通角色不自动拥有新增权限。
- 角色授权页可立即勾选新节点。

第一版实现可统一“新增后自动授予 superadmin”，避免超级管理员创建节点后自己看不到或无法继续维护。

## Risks / Trade-offs

- **权限 key 修改风险**：`menus.name` 被前端路由、按钮、Tab 和后端接口共同引用。编辑 key 时必须强提示，并建议仅在确认代码已同步后允许提交。
- **删除风险**：硬删除会影响历史角色授权。UI 必须展示子节点数量和角色引用数量，至少在有子节点时要求 `cascade=true`。
- **2FA 体验成本**：每次写操作都输入 2FA 更安全但操作成本更高。本需求明确要求必须校验，因此不做短期免验缓存。
- **权限缓存刷新范围**：精确更新复杂度更高；保守全量递增更简单但会让更多用户刷新权限缓存。
