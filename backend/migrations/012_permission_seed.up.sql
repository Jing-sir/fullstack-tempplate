-- 权限基础种子：保证新环境具备系统管理菜单、超级管理员角色和授权关系

INSERT INTO roles (name, title, description, status)
VALUES ('superadmin', '超级管理员', '系统内置超级管理员角色', 1)
ON CONFLICT (name) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
VALUES (0, 'systemManage', '系统管理', 1, 'systemManage', 10, 1)
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT root.id, sub.name, sub.title, sub.type, sub.icon, sub.sort, 1
FROM menus root
CROSS JOIN (VALUES
    ('operationLog',    '操作日志',   2, 'operationLog',    10),
    ('rolePermissions', '角色与权限', 2, 'rolePermissions', 20),
    ('accountManage',   '账号管理',   2, 'accountManage',   30)
) AS sub(name, title, type, icon, sort)
WHERE root.name = 'systemManage'
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT page.id, sub.name, sub.title, sub.type, '', sub.sort, 1
FROM menus page
CROSS JOIN (VALUES
    ('rolePermissions-add',        '新增角色',     3, 10),
    ('rolePermissions-view',       '查看角色权限', 3, 20),
    ('rolePermissions-edit',       '编辑角色权限', 3, 30),
    ('rolePermissions-delete',     '删除角色',     4, 40),
    ('rolePermissions-menuManage', '菜单管理',     4, 90)
) AS sub(name, title, type, sort)
WHERE page.name = 'rolePermissions'
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT page.id, sub.name, sub.title, sub.type, '', sub.sort, 1
FROM menus page
CROSS JOIN (VALUES
    ('accountManage-add',           '新增管理员',   3, 10),
    ('accountManage-edit',          '编辑管理员',   3, 20),
    ('accountManage-disable',       '启用/禁用',    4, 30),
    ('accountManage-resetPassword', '重置登录密码', 4, 40),
    ('accountManage-reset2FA',      '重置 2FA',     4, 50)
) AS sub(name, title, type, sort)
WHERE page.name = 'accountManage'
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menus m
WHERE r.name = 'superadmin'
  AND m.name IN (
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
ON CONFLICT DO NOTHING;

UPDATE admin_users
SET permission_version = permission_version + 1,
    updated_at = NOW();
