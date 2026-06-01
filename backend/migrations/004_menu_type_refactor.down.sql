-- 回滚：删除 type=3 隐藏路由页记录
DELETE FROM menus
WHERE name IN ('viewRolePermissions', 'editRolePermissions', 'addRolePermissions')
  AND type = 3;
