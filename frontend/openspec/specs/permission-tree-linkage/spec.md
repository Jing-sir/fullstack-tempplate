# permission-tree-linkage Specification

## Purpose
角色授权页允许独立配置页面、按钮和 Tabs，同时由后端保证父链完整。

## Requirements
### Requirement: 权限节点独立勾选
权限配置树 SHALL 使用 `check-strictly`。列表页、隐藏页面、按钮和 Tabs SHALL 可独立勾选，不自动联动隐藏页面。

#### Scenario: 列表页不自动授予编辑页
- **WHEN** 管理员勾选 `rolePermissions`
- **THEN** `rolePermissions-edit` 不会被前端自动加入 `checkedKeys`

#### Scenario: 隐藏页面可以单独取消
- **WHEN** 管理员取消勾选 `rolePermissions-edit`
- **THEN** 其它同级权限保持不变

### Requirement: 已选清单展示完整业务权限
右侧已选权限清单 SHALL 展示隐藏页面、按钮和 Tabs，便于管理员识别实际授权范围。

#### Scenario: 已选清单展示编辑权限
- **WHEN** 角色勾选 `rolePermissions-edit`
- **THEN** 右侧清单展示编辑角色权限

### Requirement: 查看模式只读
查看模式 SHALL 禁用全部权限 checkbox。编辑模式 SHALL 允许操作各类权限节点。

#### Scenario: 查看模式不可编辑
- **WHEN** 使用查看模式打开角色权限详情
- **THEN** 所有 checkbox 均不可操作

### Requirement: 后端保存祖先闭包
保存角色权限时，后端 SHALL 自动补齐每个已选节点的祖先节点。

#### Scenario: 单独授予 Tab 内按钮
- **WHEN** 提交一个 Tab 内按钮 menu ID
- **THEN** 后端同时保存其 Tab、列表页和目录祖先
