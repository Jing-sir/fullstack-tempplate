# Tasks: 权限节点可视化管理

## 1. 后端 2FA 校验能力

- [x] 1.1 在 `backend/internal/service/user_service.go` 新增当前操作者 2FA 校验方法，只接收当前用户 ID 和 `facode`，不要求登录密码。验证：新增单元测试覆盖未绑定 2FA、错误验证码、正确验证码三种情况。
- [x] 1.2 在 `backend/internal/service/interfaces.go` 补充所需 Store 方法或复用现有查询方法。验证：`go test ./internal/service` 通过。
- [x] 1.3 在 `backend/internal/handler/menu_handler.go` 的新增、编辑、删除入口中绑定 `facode` 并调用 2FA 校验。验证：缺少 `facode` 或错误 `facode` 时接口返回 400，且数据库无变更。

## 2. 后端权限节点写接口补齐

- [x] 2.1 扩展 `service.CreateMenuInput` 和 `service.UpdateMenuInput`，纳入前端需要提交的字段和 `facode`，并保持现有父子类型校验。验证：已有菜单 Service 测试继续通过。
- [x] 2.2 在 `backend/internal/handler/handler.go` 注册 `POST /api/v1/admin/menus/status/:id`，动态参数保持最后一个片段。验证：`TestRegisterRoutesKeepsDynamicParametersAtEnd` 通过。
- [x] 2.3 在 `backend/internal/handler/handler.go` 注册 `POST /api/v1/admin/menus/move/:id`，请求体包含目标 `parent_id`、`sort`、`facode`。验证：路由测试通过。
- [x] 2.4 在 `backend/internal/service/menu_service.go` 增加启停和移动方法，复用 `validateParent`，禁止移动到自身或后代。验证：新增单元测试覆盖非法父级、循环父级、合法移动。
- [x] 2.5 在 `backend/internal/repository/menu_repository.go` 补充启停、移动、查询子节点数量、查询子树 ID 的方法。验证：Repository 相关测试或 Service 测试通过。
- [x] 2.6 删除接口增加 `cascade` 语义：有子节点且未传 `cascade=true` 时返回 400；`cascade=true` 删除整棵子树并清理角色关联。验证：新增 Service 测试覆盖两种删除路径。
- [x] 2.7 权限节点写操作成功后递增受影响管理员 `permission_version`。验证：菜单新增、编辑、删除后响应带新的 `X-Permission-Version`，前端能触发权限刷新。
- [x] 2.8 新增权限默认授予 `superadmin` 角色。验证：创建新权限后，`superadmin` 的角色权限列表包含新节点。

## 3. 前端 API 层

- [x] 3.1 在 `frontend/src/api/sys/role.ts` 或新建 `frontend/src/api/sys/menu.ts` 中定义 `PermissionMenuNode`、`CreatePermissionMenuParams`、`UpdatePermissionMenuParams`、`DeletePermissionMenuParams`、`MovePermissionMenuParams`。验证：无 `any`，`pnpm run typecheck` 通过。
- [x] 3.2 补充权限节点管理 API 方法：全量树、新增、编辑、删除、启停、移动。验证：方法返回类型显式声明，ESLint 无报错。
- [x] 3.3 更新 `TreeDataType` 或新增权限管理专用类型，确保 `name`、`icon`、`sort`、`status`、`type` 不丢失。验证：角色授权页仍能正常渲染权限树。

## 4. 前端权限节点管理 UI

- [x] 4.1 在 `frontend/src/views/SystemManage/role-permissions/form/Index.vue` 增加 `管理权限节点` 入口，仅拥有 `rolePermissions-menuManage` 时显示。验证：有权限显示，无权限隐藏。
- [x] 4.2 新建 `frontend/src/views/SystemManage/role-permissions/modal/PermissionNodeManagerDrawer.vue`，实现完整权限树、搜索、类型筛选、节点选择和刷新。验证：打开 Drawer 后能看到完整权限树。
- [x] 4.3 新建或内置 `PermissionNodeFormDrawer.vue`，支持新增根节点、新增子节点、编辑节点，字段包含父级、类型、名称、权限 key、图标、排序、状态、2FA。验证：表单必填、权限 key 格式、排序数字校验生效。
- [x] 4.4 父级选择器根据节点类型禁用非法父级，前端提示父子规则。验证：按钮不能选择根节点为父级，隐藏页不能选择目录为父级。
- [x] 4.5 节点删除、启停、移动排序使用确认弹窗并要求输入 2FA。验证：未输入 2FA 不能提交，取消确认无副作用。
- [x] 4.6 编辑权限 key 时展示高风险提示，提示需同步前端路由、按钮、Tab 和后端接口。验证：修改 `name` 前必须二次确认。
- [x] 4.7 权限节点写操作成功后刷新 Drawer 树、刷新角色授权树，并调用 `sidebarStore.refreshPermissions()`。验证：新增节点后角色授权树立即可见。

## 5. 角色授权页联动

- [x] 5.1 角色授权页重新拉取权限树时保留当前模块定位和已勾选状态，不因为管理 Drawer 关闭而丢失角色表单内容。验证：编辑角色时新增权限节点后，原本勾选项仍保留。
- [x] 5.2 右侧已选清单展示新增的隐藏页、Tab、按钮和 Tab 内按钮。验证：勾选新建 Tab 内按钮后，右侧清单路径展示完整父链。
- [x] 5.3 查看模式下隐藏权限节点管理入口或禁用写操作。验证：查看角色权限页面不能新增/编辑/删除权限节点。

## 6. 后端与前端集成测试

- [x] 6.1 补充后端路由测试，确认新增 status/move 接口动态参数仍在最后一个片段。验证：`go test ./internal/handler` 通过。
- [x] 6.2 补充后端菜单 Service 测试，覆盖父子类型规则、循环父级、cascade 删除、2FA 拦截。验证：`go test ./internal/service` 通过。
- [ ] 6.3 补充前端组件或 e2e 测试，覆盖管理入口显隐、打开权限节点管理、创建节点后树刷新。验证：对应测试通过。
- [x] 6.4 运行 `go test ./...` 和 `go vet ./...`。验证：无失败。
- [x] 6.5 运行 `pnpm run typecheck` + `pnpm exec eslint` 自测。验证：无新增 TypeScript 或 ESLint 报错。
