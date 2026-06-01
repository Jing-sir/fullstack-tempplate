-- 回滚：从 superadmin 角色移除 migration 004/005/006 新增的菜单关联
DELETE FROM role_menus
WHERE role_id = (SELECT id FROM roles WHERE name = 'superadmin')
  AND menu_id IN (
      SELECT id FROM menus
      WHERE name IN (
          'viewRolePermissions', 'editRolePermissions', 'addRolePermissions',
          'addAccount', 'editAccount',
          'rolePermissions-add',
          'accountManage-add', 'accountManage-disable'
      )
  );
