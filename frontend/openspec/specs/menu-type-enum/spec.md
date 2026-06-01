# menu-type-enum Specification

## Purpose
TBD - created by archiving change permission-type-refactor. Update Purpose after archive.
## Requirements
### Requirement: menus.type 枚举扩展为 4 个值
后端 `model/menu.go` 的 `MenuType` 常量 SHALL 定义为：
- `MenuTypeDir = 1`：目录/分组，无路由，进侧边栏但不可点击
- `MenuTypePage = 2`：菜单页，有路由，进侧边栏可点击，`name` = 前端路由 `name`
- `MenuTypeHidden = 3`：隐藏路由页，有路由，`meta.isShow:true`，不进侧边栏
- `MenuTypeButton = 4`：按钮权限，无路由，`name` 格式为 `routeName-action`

原 `MenuTypeMenu=1` 和 `MenuTypeButton=2` 常量 SHALL 被移除。

#### Scenario: 新增菜单记录时类型校验
- **WHEN** 调用 `POST /api/v1/menus` 传入 `type` 值不在 1-4 范围内
- **THEN** 接口返回 400，错误信息说明 type 合法范围

#### Scenario: type=3 必须有 type=2 父节点
- **WHEN** 调用 `POST /api/v1/menus` 传入 `type=3` 且 `parent_id` 指向的节点 type 不是 2
- **THEN** 接口返回 400，错误信息说明 type=3 必须挂在菜单页节点下

#### Scenario: type=4 必须有父节点
- **WHEN** 调用 `POST /api/v1/menus` 传入 `type=4` 且 `parent_id=0`
- **THEN** 接口返回 400，错误信息说明按钮权限必须挂在菜单节点下

### Requirement: 数据库迁移正确重分类存量数据
迁移 SQL SHALL 完成以下操作：
1. 将 `parent_id=0 AND type=1` 的记录更新为 `type=1`（目录，原值不变，语义对齐）
2. 将 `parent_id!=0 AND type=1` 的记录更新为 `type=2`（菜单页）
3. 将 `type=2` 的按钮记录更新为 `type=4`
4. 插入三条 type=3 记录：`viewRolePermissions`、`editRolePermissions`、`addRolePermissions`，parent_id 指向 `rolePermissions` 菜单页

#### Scenario: 迁移后侧边栏菜单结构不变
- **WHEN** 迁移 SQL 执行完毕，前端调用 GET /api/v1/menus
- **THEN** 返回的菜单树层级结构与迁移前完全一致，type=1 节点为目录，type=2 节点为可点击菜单页

#### Scenario: 迁移后三条隐藏路由页记录存在
- **WHEN** 迁移 SQL 执行完毕
- **THEN** menus 表中存在 name 分别为 viewRolePermissions、editRolePermissions、addRolePermissions 的三条记录，type=3，parent_id 指向 rolePermissions 记录的 id

### Requirement: 后端接口透传 type 字段
`GET /api/v1/menus` 和 `GET /api/v1/admin/menus` 的响应中，每个菜单节点 SHALL 包含 `type` 字段（integer）。

#### Scenario: 菜单树响应包含 type
- **WHEN** 调用 GET /api/v1/menus
- **THEN** 响应中每个节点包含 `type` 字段，值为 1-4 之一

