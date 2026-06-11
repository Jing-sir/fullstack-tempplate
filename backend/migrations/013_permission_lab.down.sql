-- 回滚权限验证中心及其全部子权限。

WITH RECURSIVE permission_lab_nodes AS (
    SELECT id
    FROM menus
    WHERE name = 'permissionLab'

    UNION ALL

    SELECT child.id
    FROM menus child
    INNER JOIN permission_lab_nodes parent ON child.parent_id = parent.id
)
DELETE FROM role_menus
WHERE menu_id IN (SELECT id FROM permission_lab_nodes);

WITH RECURSIVE permission_lab_nodes AS (
    SELECT id
    FROM menus
    WHERE name = 'permissionLab'

    UNION ALL

    SELECT child.id
    FROM menus child
    INNER JOIN permission_lab_nodes parent ON child.parent_id = parent.id
)
DELETE FROM menus
WHERE id IN (SELECT id FROM permission_lab_nodes);

UPDATE admin_users
SET permission_version = permission_version + 1,
    updated_at = NOW();
