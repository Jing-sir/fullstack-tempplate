# hidden-route-permission Specification

## Purpose
隐藏业务页面必须独立授权，禁止通过地址栏输入 URL 绕过权限校验。

## Requirements
### Requirement: 隐藏页面严格校验业务权限 key
隐藏页面 SHALL 显式声明 `meta.permissionKey` 和 `meta.permissionParent`。路由守卫 SHALL 先确认父列表页权限，再请求父页面子权限树，并严格校验隐藏页面的业务权限 key。

#### Scenario: 独立授权后正常访问
- **WHEN** 用户拥有 `rolePermissions` 和 `rolePermissions-view`
- **THEN** 访问 `/systemManage/viewRolePermissions/:id/:see` 时正常渲染

#### Scenario: 只有父列表权限时拒绝直接访问
- **WHEN** 用户只有 `rolePermissions`，没有 `rolePermissions-edit`
- **THEN** 直接输入 `/systemManage/editRolePermissions/:id` 时跳转 no-permission 页

### Requirement: 禁止父级 fallback 放行
路由守卫 SHALL NOT 因为用户拥有父列表页权限而放行未授权隐藏页面。

#### Scenario: 隐藏页面未配置时拒绝访问
- **WHEN** 用户拥有 `rolePermissions`，但目标隐藏页面权限未入库或未授权
- **THEN** 路由守卫跳转 no-permission 页

### Requirement: 前端 TreeDataType 透传 type 字段
`TreeDataType` SHALL 包含 `type?: number`。`sysRoleMenuList` normalize SHALL 保留后端返回的 `item.type`。

#### Scenario: normalize 后 type 字段不丢失
- **WHEN** 后端返回菜单节点含 `type: 3`
- **THEN** normalize 后对象的 `type` 值为 3
