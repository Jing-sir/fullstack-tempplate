-- 回滚业务权限 key 收敛
DELETE FROM menus
WHERE name IN (
    'rolePermissions-view', 'rolePermissions-edit', 'rolePermissions-delete',
    'accountManage-edit', 'accountManage-resetPassword', 'accountManage-reset2FA',
    'rolePermissions-menuManage'
);

UPDATE menus SET type = 4 WHERE name IN ('rolePermissions-add', 'accountManage-add');

ALTER TABLE menus DROP CONSTRAINT IF EXISTS ck_menus_type;
DROP INDEX IF EXISTS idx_role_menus_menu_id;

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT m.id, sub.name, sub.title, 3, '', sub.sort, 1
FROM menus m
CROSS JOIN (VALUES
    ('viewRolePermissions', '查看权限', 1),
    ('editRolePermissions', '编辑角色', 2),
    ('addRolePermissions',  '新增角色', 3)
) AS sub(name, title, sort)
WHERE m.name = 'rolePermissions'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT m.id, sub.name, sub.title, 3, '', sub.sort, 1
FROM menus m
CROSS JOIN (VALUES
    ('addAccount',  '新增账号', 1),
    ('editAccount', '编辑账号', 2)
) AS sub(name, title, sort)
WHERE m.name = 'accountManage'
ON CONFLICT (name) DO NOTHING;
