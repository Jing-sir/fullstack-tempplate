## Why

菜单权限表 `menus` 的 `type` 字段目前只有 1=菜单、2=按钮两种语义，无法区分"目录分组"与"叶子菜单页"，也没有"隐藏路由页"这一类型。导致 `viewRolePermissions` 等表单页未注册到菜单表，前端路由守卫找不到对应权限 key，直接跳转"无权限"页面，形成逻辑断层。

## What Changes

- **BREAKING** `menus.type` 枚举从 `1=菜单 2=按钮` 扩展为 `1=目录 2=菜单页 3=隐藏路由页 4=按钮`，原 type=2 按钮数据迁移为 type=4
- 后端 `model/menu.go` 扩展 `MenuType` 常量，`menu_service.go` 增加新 type 的业务校验
- 新增数据库迁移 SQL：重新分类现有数据，新增 `viewRolePermissions` / `editRolePermissions` / `addRolePermissions` 三条 type=3 记录
- 前端 `sideBar.ts` 修复 type=4 按钮 key（`routeName-action` 格式）误混入路由过滤逻辑的 bug
- 前端 `router-setup.ts` 守卫加安全网：`meta.isShow:true` 且不在 permissionMap 时，fallback 向上找父级 name 校验
- 前端权限配置树（`role-permissions/form/Index.vue`）增加 type=2 勾选时自动联动 type=3 子节点的逻辑，type=3 节点不可单独操作
- 前端 `SideNavigationBar` 补充三级及以上菜单的 CSS 缩进样式（`Item.vue` 已是递归结构，只需样式）
- 前端 `TreeDataType` / `role.ts` 透传 `type` 字段

## Capabilities

### New Capabilities

- `menu-type-enum`: 扩展 menus.type 枚举（1=目录 2=菜单页 3=隐藏路由页 4=按钮）及后端模型、服务层校验
- `hidden-route-permission`: 隐藏路由页（type=3）的权限注册与路由守卫校验闭环
- `permission-tree-linkage`: 权限配置树中 type=2 勾选时自动联动 type=3 子节点的交互逻辑
- `sidebar-multilevel`: 侧边栏三级及以上菜单的 CSS 样式支持

### Modified Capabilities

（无现有 spec 文件，本次全部为新增）

## Impact

**后端文件**
- `backend/internal/model/menu.go`
- `backend/internal/service/menu_service.go`
- `backend/migrations/`（新增迁移 SQL）
- `backend/internal/handler/menu_handler.go`（确认 type 字段序列化透传）

**前端文件**
- `frontend/src/interface/SystemManageType.ts`
- `frontend/src/api/sys/role.ts`
- `frontend/src/store/sideBar.ts`
- `frontend/src/setup/router-setup.ts`
- `frontend/src/views/SystemManage/role-permissions/form/Index.vue`
- `frontend/src/components/SideNavigationBar/index.vue`

**数据变更**
- `menus` 表：type 值重新分类（breaking），新增 3 条 type=3 记录

**无影响范围**
- `permissionRoutes.ts` 路由定义本身不需要改
- `v-permission` 指令、`/api/v1/me` 不在本次范围
