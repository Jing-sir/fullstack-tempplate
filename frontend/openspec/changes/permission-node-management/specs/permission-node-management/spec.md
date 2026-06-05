## ADDED Requirements

### Requirement: 权限节点可视化管理入口
角色权限配置页面 SHALL 为拥有 `rolePermissions-menuManage` 的管理员提供权限节点管理入口。该入口 SHALL 打开完整权限树管理界面，而不是直接修改角色已选权限。

#### Scenario: 有菜单管理权限时显示入口
- **WHEN** 当前管理员拥有 `rolePermissions-menuManage`
- **THEN** 角色权限配置页面展示 `管理权限节点` 操作入口

#### Scenario: 无菜单管理权限时隐藏入口
- **WHEN** 当前管理员没有 `rolePermissions-menuManage`
- **THEN** 角色权限配置页面不展示权限节点管理入口

### Requirement: 权限节点完整树查看
权限节点管理界面 SHALL 展示完整 `menus` 树，并支持搜索、类型筛选、节点详情查看和手动刷新。

#### Scenario: 打开权限节点管理界面
- **WHEN** 管理员点击 `管理权限节点`
- **THEN** 系统请求 `POST /api/v1/admin/menus/list` 并展示完整权限树

#### Scenario: 搜索权限节点
- **WHEN** 管理员输入权限名称或权限 key
- **THEN** 权限树只展示命中节点及其父链

### Requirement: 新增权限节点
权限节点管理界面 SHALL 支持新增根节点和新增子节点。新增请求 SHALL 由后端校验权限 key 唯一性、父子类型合法性和当前操作者 2FA。

#### Scenario: 新增按钮权限
- **WHEN** 管理员在列表页节点下新增 `type=4` 按钮权限并提交正确 2FA
- **THEN** 后端创建权限节点，角色授权页刷新后可勾选该按钮权限

#### Scenario: 新增 Tab 内按钮权限
- **WHEN** 管理员在 `type=5` Tab 节点下新增 `type=4` 按钮权限
- **THEN** 后端创建成功并保留 Tab 与按钮层级

#### Scenario: 权限 key 重复
- **WHEN** 管理员提交已存在的权限 key
- **THEN** 后端返回 409，权限树不发生变更

#### Scenario: 父子类型非法
- **WHEN** 管理员尝试在根节点下新增 `type=4` 按钮
- **THEN** 后端返回 400，权限树不发生变更

### Requirement: 编辑权限节点
权限节点管理界面 SHALL 支持编辑权限节点的父级、权限 key、展示名称、类型、图标、排序和状态。编辑请求 SHALL 强制校验当前操作者 2FA，并由后端阻止循环父级。

#### Scenario: 编辑展示名称和排序
- **WHEN** 管理员修改节点 title 和 sort 并提交正确 2FA
- **THEN** 权限树刷新后展示新的标题和排序

#### Scenario: 移动父级
- **WHEN** 管理员将按钮权限从一个列表页移动到另一个列表页并提交正确 2FA
- **THEN** 后端保存新的 parent_id，角色授权页展示新的父链路径

#### Scenario: 移动到自身后代
- **WHEN** 管理员把节点父级设置为自己或自己的后代
- **THEN** 后端返回 400，权限树不发生变更

#### Scenario: 修改权限 key 的高风险提示
- **WHEN** 管理员修改 `menus.name`
- **THEN** 前端必须提示该 key 可能被路由、按钮、Tab 和后端接口引用，确认后才允许提交

### Requirement: 删除权限节点
权限节点管理界面 SHALL 支持删除权限节点。删除请求 SHALL 强制校验当前操作者 2FA，并按 cascade 策略处理子树。

#### Scenario: 删除叶子节点
- **WHEN** 管理员删除无子节点权限并提交正确 2FA
- **THEN** 后端删除该节点并清理对应角色授权关系

#### Scenario: 删除有子节点的权限但未确认级联
- **WHEN** 管理员删除有子节点的权限且 `cascade=false`
- **THEN** 后端返回 400，并提示需要确认级联删除

#### Scenario: 级联删除权限子树
- **WHEN** 管理员删除有子节点的权限且 `cascade=true` 并提交正确 2FA
- **THEN** 后端删除整棵子树并清理所有相关角色授权关系

### Requirement: 启停和排序权限节点
权限节点管理界面 SHALL 支持启用、禁用和移动排序权限节点。所有写操作 SHALL 强制校验当前操作者 2FA。

#### Scenario: 禁用权限节点
- **WHEN** 管理员禁用权限节点并提交正确 2FA
- **THEN** 后端将该节点 status 更新为禁用，后续权限计算不包含该节点

#### Scenario: 调整排序
- **WHEN** 管理员调整同级节点排序并提交正确 2FA
- **THEN** 权限树按新的 sort 顺序展示

### Requirement: 2FA 后端强校验
权限节点新增、编辑、删除、启停、移动和排序接口 SHALL 在后端校验当前操作者 2FA。前端弹窗校验 SHALL NOT 作为安全边界。

#### Scenario: 缺少 2FA 验证码
- **WHEN** 管理员直接调用权限节点写接口且请求体不包含 `facode`
- **THEN** 后端返回 400，且不执行数据写入

#### Scenario: 2FA 验证码错误
- **WHEN** 管理员提交错误 `facode`
- **THEN** 后端返回 400，且不执行数据写入

#### Scenario: 当前账号未绑定 2FA
- **WHEN** 未绑定 2FA 的管理员调用权限节点写接口
- **THEN** 后端返回 400，且不执行数据写入

### Requirement: 权限变更缓存失效
权限节点写操作成功后，系统 SHALL 写入操作日志并递增受影响管理员的 `permission_version`，使前端权限缓存刷新。

#### Scenario: 新增权限后刷新授权树
- **WHEN** 管理员新增权限节点成功
- **THEN** 角色授权页重新拉取全量权限树后可看到该节点

#### Scenario: 删除权限后刷新用户权限
- **WHEN** 管理员删除已授权给角色的权限节点
- **THEN** 相关用户后续响应返回新的 `X-Permission-Version`，前端刷新菜单和页面子权限缓存

### Requirement: API 路径约束
权限节点管理新增或修改接口 SHALL 遵守动态路径参数只能出现在 URL 最后一个片段的项目约束。筛选、移动目标、cascade 和 2FA 参数 SHALL 放在请求体中。

#### Scenario: status 接口路径合法
- **WHEN** 注册启停接口
- **THEN** 路径格式为 `POST /api/v1/admin/menus/status/:id`

#### Scenario: move 接口路径合法
- **WHEN** 注册移动接口
- **THEN** 路径格式为 `POST /api/v1/admin/menus/move/:id`
