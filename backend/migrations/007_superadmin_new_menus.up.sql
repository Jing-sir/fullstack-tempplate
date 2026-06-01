-- 迁移：把 migration 004/005/006 新增的 type=3/4 菜单关联到 superadmin 角色
-- 执行条件：superadmin 角色存在，且上述菜单已插入（id 36-43）

INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menus m
WHERE r.name = 'superadmin'
  AND m.name IN (
      -- type=3 隐藏路由页
      'viewRolePermissions', 'editRolePermissions', 'addRolePermissions',
      'addAccount', 'editAccount',
      -- type=4 按钮权限
      'rolePermissions-add',
      'accountManage-add', 'accountManage-disable'
  )
ON CONFLICT DO NOTHING;
