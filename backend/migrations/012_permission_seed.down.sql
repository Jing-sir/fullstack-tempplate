-- 回滚权限基础种子

DELETE FROM role_menus
WHERE menu_id IN (
    SELECT id FROM menus
    WHERE name IN (
        'systemManage',
        'operationLog',
        'rolePermissions',
        'rolePermissions-add',
        'rolePermissions-view',
        'rolePermissions-edit',
        'rolePermissions-delete',
        'rolePermissions-menuManage',
        'accountManage',
        'accountManage-add',
        'accountManage-edit',
        'accountManage-disable',
        'accountManage-resetPassword',
        'accountManage-reset2FA'
    )
);

DELETE FROM menus
WHERE name IN (
    'operationLog',
    'rolePermissions-add',
    'rolePermissions-view',
    'rolePermissions-edit',
    'rolePermissions-delete',
    'rolePermissions-menuManage',
    'accountManage-add',
    'accountManage-edit',
    'accountManage-disable',
    'accountManage-resetPassword',
    'accountManage-reset2FA',
    'rolePermissions',
    'accountManage',
    'systemManage'
);

DELETE FROM roles WHERE name = 'superadmin';

UPDATE admin_users
SET permission_version = permission_version + 1,
    updated_at = NOW();
