## 1. 后端：扩展 MenuType 枚举常量

- [ ] 1.1 修改 `backend/internal/model/menu.go`：将 `MenuTypeMenu=1` 重命名为 `MenuTypeDir=1`，添加 `MenuTypePage=2`、`MenuTypeHidden=3`，将 `MenuTypeButton=2` 改为 `MenuTypeButton=4`；确认 `Menu` struct 的 `type json:"type"` 字段已存在，序列化正常透传。验证：`go build ./...` 无编译错误

## 2. 后端：menu_service 类型校验

- [ ] 2.1 修改 `backend/internal/service/menu_service.go` 的 `Create` 方法：校验 `input.Type` 在 1-4 范围内，否则返回业务错误；校验 type=3 时 `parent_id != 0` 且父节点 type=2；校验 type=4 时 `parent_id != 0`。验证：`go test ./internal/service/...` 无失败（如无测试则手动 curl 验证入参校验）

## 3. 后端：数据库迁移 SQL

- [ ] 3.1 新增迁移文件 `backend/migrations/002_menu_type_refactor.sql`：① 将 `parent_id!=0 AND type=1` 的记录更新为 `type=2`；② 将 `type=2`（原按钮）更新为 `type=4`；③ 插入三条 type=3 记录（viewRolePermissions、editRolePermissions、addRolePermissions），parent_id 查询 `rolePermissions` 的 id。验证：在本地数据库执行迁移后，查询 `SELECT name, type FROM menus ORDER BY type, id` 确认分类正确，rolePermissions 子节点三条记录存在

## 4. 前端：SystemManageType 增加 type 字段

- [ ] 4.1 修改 `frontend/src/interface/SystemManageType.ts` 的 `TreeDataType`：添加 `type?: number` 字段。验证：`pnpm run typecheck` 无新增错误

## 5. 前端：role.ts normalize 透传 type

- [ ] 5.1 修改 `frontend/src/api/sys/role.ts` 的 `sysRoleMenuList` 中的 `normalize` 函数：将 `item.type` 转为 number 后赋给 `TreeDataType.type`（`type: typeof item.type === 'number' ? item.type : Number(item.type ?? 0)`）。验证：`pnpm run typecheck` 通过；浏览器 Network 面板确认 /admin/menus 返回数据中 type 字段存在且 normalize 后前端对象含 type

## 6. 前端：sideBar.ts 过滤 type=4 按钮

- [ ] 6.1 修改 `frontend/src/store/sideBar.ts` 的 `collectComponents` 函数：在收集 key 时跳过 `item.type === 4` 的节点（`if (item.type === 4) continue` 或在 for 循环入口处 guard）；同步更新 `MenuItem` 类型定义加 `type?: number`。验证：`pnpm run typecheck` 通过；确认 `fetchRoleObj` 中不含 `xxx-edit` 格式的 key

## 7. 前端：router-setup.ts isShow 安全网

- [ ] 7.1 修改 `frontend/src/setup/router-setup.ts` 的 `setRequiresAuth` 守卫：在 `permissionMap[routeRole]` 校验失败后，若 `to.meta.isShow === true`，向上遍历 `to.matched`（倒序，跳过自身），找第一个 `!r.meta?.isShow && permissionMap[String(r.name ?? '')]` 的节点，若找到则放行并 `console.warn`；否则跳转 no-permission。验证：`pnpm run typecheck` 通过；在数据库删除 viewRolePermissions 记录后，访问该路由确认 fallback 生效（console 有 warn，页面正常渲染）；恢复数据后，有权限时正常访问，无权限时跳 no-permission

## 8. 前端：role-permissions/form/Index.vue 权限树联动

- [ ] 8.1 在 `frontend/src/views/SystemManage/role-permissions/form/Index.vue` 中：新增 `collectHiddenDescendants(nodes, type=3)` helper，递归收集指定节点下所有 type=3 后代的 menuId；修改 `readonlyTreeData` computed 中 `disableCheckbox` 逻辑：type=3 节点始终 `disableCheckbox: true`（查看模式和编辑模式均如此）。验证：渲染权限树后，type=3 节点 checkbox 呈灰色禁用状态
- [ ] 8.2 在同文件中：监听 `currState.checkedKeys` 的变化（或在树组件 `@check` 事件中），当新增勾选的节点为 type=2 时，自动将其 type=3 后代 key 补入 `checkedKeys`；当取消勾选 type=2 节点时，自动将其 type=3 后代 key 从 `checkedKeys` 移除。注意：变更 `checkedKeys` 时避免触发循环 watch，使用 `nextTick` 或在赋值前 diff。验证：勾选 rolePermissions（type=2）后，viewRolePermissions 等 type=3 key 自动出现在 checkedKeys；取消勾选后自动移除
- [ ] 8.3 在同文件中：修改 `selectedPermissionList` computed 的过滤条件，排除 type=3 节点（`item.type !== 3`），使右侧已选权限清单不展示 type=3 条目。验证：已选清单中不出现 viewRolePermissions 等隐藏路由页条目

## 9. 前端：SideNavigationBar 三级菜单 CSS

- [ ] 9.1 在 `frontend/src/components/SideNavigationBar/index.vue` 的 `<style scoped>` 中：为 Arco Menu 三级及以上的嵌套 `arco-menu-inline` 添加缩进样式，`:deep(.arco-menu-inline .arco-menu-inline .arco-menu-item)` 和 `:deep(.arco-menu-inline .arco-menu-inline .arco-menu-inline-header)` 增加 `padding-left` 递增规则（每级 +16px）；确认折叠态下三级菜单不显示文字。验证：手动在数据库插入一条三级菜单数据，刷新侧边栏，确认三级菜单缩进层级清晰可辨，父链高亮正确（父节点 active 描边，叶子节点 primary 背景）

## 10. 自测验收

- [ ] 10.1 运行 `pnpm run typecheck`，确认 0 新增 TS 错误
- [ ] 10.2 运行 `pnpm exec eslint src/interface/SystemManageType.ts src/api/sys/role.ts src/store/sideBar.ts src/setup/router-setup.ts src/views/SystemManage/role-permissions/form/Index.vue src/components/SideNavigationBar/index.vue`，确认 0 报错
- [ ] 10.3 浏览器端对端验证：① 角色权限配置页正常加载权限树，type=3 节点 checkbox 禁用 ② 勾选菜单页时 type=3 子节点自动联动，右侧清单不展示 type=3 ③ 保存角色后，点击"查看权限"不再跳转"无权限"页面，正常渲染 ④ 三级菜单（若有数据）侧边栏缩进正常
