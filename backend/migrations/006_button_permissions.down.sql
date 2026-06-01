-- 回滚：删除 type=4 按钮权限记录
DELETE FROM menus
WHERE name IN (
    'rolePermissions-add',
    'accountManage-add',
    'accountManage-disable'
) AND type = 4;
