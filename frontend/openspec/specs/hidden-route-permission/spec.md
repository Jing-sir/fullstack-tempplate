# hidden-route-permission Specification

## Purpose
TBD - created by archiving change permission-type-refactor. Update Purpose after archive.
## Requirements
### Requirement: type=3 隐藏路由页通过 permissionMap 正常放行
前端 `sideBar.ts` 的 `collectComponents` SHALL 将后端返回的所有 type=1/2/3 菜单节点的 `name` 收集进 `fetchRoleObj`，type=4 按钮节点 SHALL 被跳过，不混入路由过滤逻辑。

#### Scenario: type=3 路由正常放行
- **WHEN** 当前用户角色拥有 `viewRolePermissions` 菜单权限（type=3）
- **THEN** 访问 `/systemManage/viewRolePermissions/:id/:see` 时路由守卫校验通过，页面正常渲染

#### Scenario: type=4 按钮 key 不干扰路由过滤
- **WHEN** 用户角色拥有 `rolePermissions-edit`（type=4）权限
- **THEN** `getAsyRouter` 不会尝试匹配名为 `rolePermissions-edit` 的路由，路由列表不受影响

### Requirement: isShow 路由守卫安全网
前端 `router-setup.ts` 的 `setRequiresAuth` 守卫 SHALL 在以下条件同时满足时执行 fallback：
- 目标路由 `meta.isShow === true`
- 目标路由 `name` 不在 `permissionMap` 中

Fallback 逻辑：向上遍历 `to.matched`，找到第一个 `meta.isShow` 不为 true 且 `name` 在 `permissionMap` 中的父级，若找到则放行，否则跳转 no-permission 页。同时 SHALL 在 console 输出 warn，提示该路由未注册到菜单表。

#### Scenario: isShow 路由未入库时 fallback 到父级权限
- **WHEN** 用户有 `rolePermissions`（type=2）权限，但 `viewRolePermissions`（type=3）尚未入库
- **THEN** 路由守卫 fallback 找到父级 `rolePermissions`，放行访问，console 输出 warn

#### Scenario: 父级也无权限时跳转 no-permission
- **WHEN** 用户没有 `rolePermissions` 权限，访问 `/systemManage/viewRolePermissions/1/1`
- **THEN** 路由守卫跳转到 no-permission 页面

### Requirement: 前端 TreeDataType 透传 type 字段
`frontend/src/interface/SystemManageType.ts` 的 `TreeDataType` SHALL 包含 `type?: number` 字段。
`frontend/src/api/sys/role.ts` 的 `sysRoleMenuList` normalize 函数 SHALL 将后端返回的 `item.type` 赋值给 `TreeDataType.type`。

#### Scenario: normalize 后 type 字段不丢失
- **WHEN** 后端返回菜单节点含 `type: 3`
- **THEN** 前端 normalize 后的 TreeDataType 对象 `type` 值为 3

