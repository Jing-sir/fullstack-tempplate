## 1. 后端：扩展 MenuType 枚举常量

- [x] 1.1 修改 `backend/internal/model/menu.go`

## 2. 后端：menu_service 类型校验

- [x] 2.1 修改 `backend/internal/service/menu_service.go` 的 `Create` 方法

## 3. 后端：数据库迁移 SQL

- [x] 3.1 新增迁移文件 `backend/migrations/004_menu_type_refactor.up.sql` 及 `.down.sql`

## 4. 前端：SystemManageType 增加 type 字段

- [x] 4.1 修改 `frontend/src/interface/SystemManageType.ts` 的 `TreeDataType`：添加 `type?: number` 字段

## 5. 前端：role.ts normalize 透传 type

- [x] 5.1 修改 `frontend/src/api/sys/role.ts` 的 `sysRoleMenuList` normalize 函数透传 `type`

## 6. 前端：sideBar.ts 过滤 type=4 按钮

- [x] 6.1 修改 `frontend/src/store/sideBar.ts` 的 `collectComponents` 函数过滤 type=4

## 7. 前端：router-setup.ts isShow 安全网

- [x] 7.1 修改 `frontend/src/setup/router-setup.ts` 的 `setRequiresAuth` 守卫加 isShow 安全网

## 8. 前端：role-permissions/form/Index.vue 权限树联动

- [x] 8.1 新增 `collectHiddenDescendants` helper，type=3 节点始终 `disableCheckbox: true`
- [x] 8.2 watch `checkedKeys`，type=2 勾选/取消时自动联动 type=3 子节点（nextTick 防循环）
- [x] 8.3 `selectedPermissionList` 过滤 type=3，右侧已选清单不展示隐藏路由页

## 9. 前端：SideNavigationBar 三级菜单 CSS

- [x] 9.1 在 `frontend/src/components/SideNavigationBar/index.vue` 补充三级及以上菜单缩进 CSS

## 10. 自测验收

- [x] 10.1 运行 `pnpm run typecheck`，确认 0 新增 TS 错误
- [x] 10.2 运行 `pnpm exec eslint src/interface/SystemManageType.ts src/api/sys/role.ts src/store/sideBar.ts src/setup/router-setup.ts src/views/SystemManage/role-permissions/form/Index.vue src/components/SideNavigationBar/index.vue`，确认 0 报错
- [x] 10.3 浏览器端对端验证：① 角色权限配置页正常加载权限树，type=3 节点 checkbox 禁用 ② 勾选菜单页时 type=3 子节点自动联动，右侧清单不展示 type=3 ③ 保存角色后，点击"查看权限"不再跳转"无权限"页面，正常渲染 ④ 三级菜单（若有数据）侧边栏缩进正常
