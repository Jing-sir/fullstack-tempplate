# Proposal: 权限节点可视化管理

## Why

当前“编辑角色权限”页面只能给角色勾选已有权限节点，权限节点本身仍主要依赖后端种子数据或迁移脚本维护。后续业务会持续新增列表、隐藏页、Tab、按钮和 Tab 内按钮权限，如果每次都改数据库，会让权限体系变成开发期静态配置，无法满足后台管理员在界面中维护权限字典的需求。

本变更要把权限树本身做成可视化可维护对象：管理员可以在界面里新增、编辑、删除、启停和排序权限节点，然后角色授权页立即消费最新权限树。

## What Changes

**旧项目文件清单：**

- 无旧项目迁移文件。本变更基于当前项目已有权限体系扩展：
  - `frontend/src/views/SystemManage/role-permissions/form/Index.vue`
  - `frontend/src/api/sys/role.ts`
  - `backend/internal/handler/menu_handler.go`
  - `backend/internal/service/menu_service.go`
  - `backend/internal/repository/menu_repository.go`
  - `backend/internal/handler/handler.go`

**新增/改造内容：**

- 在角色权限配置页面提供“管理权限节点”入口，仅拥有 `rolePermissions-menuManage` 的管理员可见。
- 新增权限节点管理 UI，支持完整权限树查看、搜索、选中节点详情、节点新增、编辑、删除、启停、排序和移动父级。
- 权限节点继续复用 `menus` 表和现有 `type=1..5` 模型，不新增独立权限表。
- 扩展 `admin/menus` 写接口，所有写操作必须携带并通过当前操作者 2FA 验证码。
- 权限节点变更后刷新权限树、同步角色授权页、写操作日志并递增相关用户 `permission_version`。
- 新增前后端测试覆盖：父子类型校验、循环父级拦截、2FA 必填/错误拦截、角色页可见性与树刷新。

## Capabilities

### New Capabilities

- `permission-node-management`：权限节点可视化管理，支持新增、编辑、删除、启停、排序、移动父级和 2FA 强校验。

### Modified Capabilities

- `permission-tree-linkage`：角色授权页消费最新权限树，并在权限节点变更后刷新。
- `menu-type-enum`：权限节点管理写操作继续遵守目录、列表页、隐藏页、按钮、Tab 的父子类型约束。

## Impact

**后端 API：**

- 保留并扩展：
  - `POST /api/v1/admin/menus/list`
  - `POST /api/v1/admin/menus`
  - `PUT /api/v1/admin/menus/:id`
  - `DELETE /api/v1/admin/menus/:id`
- 新增：
  - `POST /api/v1/admin/menus/status/:id`
  - `POST /api/v1/admin/menus/move/:id`

所有写接口 SHALL 继续使用 `RequireAnyPermission("rolePermissions-menuManage")`，并要求请求体包含 `facode`。

**前端 API：**

- 在 `src/api/sys/role.ts` 或拆分出的 `src/api/sys/menu.ts` 中补充权限节点管理类型和方法。
- 禁止 `Promise<any>`，权限节点字段需显式类型化。

**前端页面：**

- 改造 `src/views/SystemManage/role-permissions/form/Index.vue`，增加管理入口和刷新联动。
- 新增权限节点管理 Drawer/Modal，建议放在 `src/views/SystemManage/role-permissions/modal/`。

**权限 key：**

- 权限节点管理入口权限：`rolePermissions-menuManage`
- 新增权限节点本身不自动代表功能生效；前端按钮、Tab、路由和后端接口仍需显式使用对应 `menus.name`。

## Non-goals

- 本次不实现“后台新增一个权限后自动生成前端页面/按钮/API”的代码生成能力。
- 本次不把权限节点拆出 `menus` 表，也不新增 ACL / ABAC 模型。
- 本次不改变角色权限保存的祖先链补齐原则。
- 本次不允许绕过后端 2FA，只做前端弹窗校验的方案。
