## ADDED Requirements

### Requirement: 勾选 type=2 菜单页时自动联动 type=3 子节点
在权限配置页（`role-permissions/form/Index.vue`）中，当用户勾选一个 type=2 菜单页节点时，该节点下所有 type=3 后代节点 SHALL 被自动加入 `currState.checkedKeys`；当用户取消勾选 type=2 节点时，其下所有 type=3 后代节点 SHALL 被自动从 `checkedKeys` 中移除。

#### Scenario: 勾选 type=2 节点联动 type=3
- **WHEN** 用户勾选权限树中 type=2 的 `rolePermissions` 节点
- **THEN** `viewRolePermissions`、`editRolePermissions`、`addRolePermissions`（type=3）自动加入 checkedKeys

#### Scenario: 取消勾选 type=2 节点联动取消 type=3
- **WHEN** 用户取消勾选 type=2 的 `rolePermissions` 节点
- **THEN** 其下所有 type=3 子节点自动从 checkedKeys 中移除

### Requirement: type=3 节点在权限配置树中不可单独操作
权限配置树中 type=3 的节点 SHALL 渲染为 `disableCheckbox: true`，用户不能直接勾选或取消勾选 type=3 节点，只能通过父级 type=2 节点联动控制。

#### Scenario: type=3 节点 checkbox 不可操作
- **WHEN** 权限配置树渲染完毕
- **THEN** type=3 节点的 checkbox 处于禁用状态（visually grayed out），点击无响应

#### Scenario: 查看模式下 type=3 节点正常展示已选状态
- **WHEN** 以查看模式（`see=true`）打开权限配置页，角色已有 viewRolePermissions 权限
- **THEN** viewRolePermissions 节点 checkbox 显示为已选且禁用状态

### Requirement: 右侧已选权限清单过滤 type=3 节点
右侧"已选权限清单"面板 SHALL 不展示 type=3 节点（隐藏路由页对管理员无业务语义），仅展示 type=1（目录分组）、type=2（菜单页）、type=4（按钮）节点。

#### Scenario: 已选清单不展示 type=3
- **WHEN** 角色已勾选 rolePermissions（type=2）及其下 type=3 子节点
- **THEN** 右侧已选清单只展示 rolePermissions，不展示 viewRolePermissions 等 type=3 条目
