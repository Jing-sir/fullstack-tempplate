# menu-type-enum Specification

## Purpose
用统一权限节点树表达目录、列表页、隐藏页面、按钮和动态 Tab。
## Requirements
### Requirement: menus.type 定义五类节点
后端 `MenuType` SHALL 定义：
- `MenuTypeDir = 1`：目录。
- `MenuTypePage = 2`：列表页 / 菜单页。
- `MenuTypeHidden = 3`：隐藏业务页面。
- `MenuTypeButton = 4`：按钮或 API 操作。
- `MenuTypeTab = 5`：页面内动态 Tab。

#### Scenario: 新增菜单记录时类型校验
- **WHEN** 菜单写接口收到不在 1-5 范围内的 `type`
- **THEN** 接口返回 400

#### Scenario: 隐藏页面父节点校验
- **WHEN** `type=3` 的父节点不是 `type=2`
- **THEN** 接口返回 400

#### Scenario: 按钮父节点校验
- **WHEN** `type=4` 的父节点不是 `type=2` 或 `type=5`
- **THEN** 接口返回 400

#### Scenario: Tab 父节点校验
- **WHEN** `type=5` 的父节点不是 `type=2` 或 `type=5`
- **THEN** 接口返回 400

### Requirement: 导航与页面子权限分开加载
`POST /api/v1/menus/list` SHALL 只返回 `type=1/2`。`POST /api/v1/permissions/list` SHALL 根据 body 中的 `parentKey` 返回当前用户在指定列表页下拥有的完整后代树。

#### Scenario: 侧边栏响应不包含按钮
- **WHEN** 用户请求 `POST /api/v1/menus/list`
- **THEN** 响应不包含 `type=3/4/5`

#### Scenario: 页面子树包含嵌套按钮
- **WHEN** 用户请求有权列表页的页面子权限
- **THEN** 响应保留 Tab 和 Tab 内按钮层级
