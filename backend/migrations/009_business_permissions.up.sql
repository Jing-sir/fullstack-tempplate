-- 权限节点收敛：
-- 1. 新增/编辑/查看页面使用业务权限 key，同时控制入口按钮、页面路由和后端 API
-- 2. 普通按钮继续使用 type=4
-- 3. type=5 预留给页面内动态 Tab

-- 已存在的新增按钮升级为隐藏页面业务权限
UPDATE menus SET type = 3, title = '新增角色'
WHERE name = 'rolePermissions-add';

UPDATE menus SET type = 3, title = '新增管理员'
WHERE name = 'accountManage-add';

-- 补齐系统管理业务权限
INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT m.id, sub.name, sub.title, sub.type, '', sub.sort, 1
FROM menus m
CROSS JOIN (VALUES
    ('rolePermissions-view',   '查看角色权限', 3, 2),
    ('rolePermissions-edit',   '编辑角色权限', 3, 3),
    ('rolePermissions-delete', '删除角色',     4, 4)
) AS sub(name, title, type, sort)
WHERE m.name = 'rolePermissions'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT m.id, sub.name, sub.title, sub.type, '', sub.sort, 1
FROM menus m
CROSS JOIN (VALUES
    ('accountManage-edit',          '编辑管理员',  3, 2),
    ('accountManage-resetPassword', '重置登录密码', 4, 3),
    ('accountManage-reset2FA',      '重置 2FA',    4, 4)
) AS sub(name, title, type, sort)
WHERE m.name = 'accountManage'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT m.id, 'rolePermissions-menuManage', '菜单管理', 4, '', 90, 1
FROM menus m
WHERE m.name = 'rolePermissions'
ON CONFLICT (name) DO NOTHING;

-- 将旧隐藏路由授权映射到新的业务权限 key
INSERT INTO role_menus (role_id, menu_id)
SELECT rm.role_id, target.id
FROM role_menus rm
JOIN menus legacy ON legacy.id = rm.menu_id
JOIN menus target ON target.name = CASE legacy.name
    WHEN 'addRolePermissions'  THEN 'rolePermissions-add'
    WHEN 'viewRolePermissions' THEN 'rolePermissions-view'
    WHEN 'editRolePermissions' THEN 'rolePermissions-edit'
    WHEN 'addAccount'          THEN 'accountManage-add'
    WHEN 'editAccount'         THEN 'accountManage-edit'
END
WHERE legacy.name IN (
    'addRolePermissions', 'viewRolePermissions', 'editRolePermissions',
    'addAccount', 'editAccount'
)
ON CONFLICT DO NOTHING;

-- route.name 与权限 key 已由前端 meta.permissionKey 解耦，移除旧路由名权限节点
DELETE FROM menus
WHERE name IN (
    'addRolePermissions', 'viewRolePermissions', 'editRolePermissions',
    'addAccount', 'editAccount'
);

-- 新增权限默认赋予超级管理员，兼容历史环境中英文角色标识
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menus m
WHERE (
      LOWER(r.name) IN ('superadmin', 'super_admin', 'super admin')
      OR LOWER(r.title) IN ('superadmin', 'super admin')
      OR r.name = '超级管理员'
      OR r.title = '超级管理员'
  )
  AND m.name IN (
      'rolePermissions-add', 'rolePermissions-view', 'rolePermissions-edit', 'rolePermissions-delete',
      'accountManage-add', 'accountManage-edit', 'accountManage-disable',
      'accountManage-resetPassword', 'accountManage-reset2FA',
      'rolePermissions-menuManage'
  )
ON CONFLICT DO NOTHING;

-- type 由数据库兜底限制在已定义范围；反向查询 role_menus 时补充索引。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_menus_type'
          AND conrelid = 'menus'::regclass
    ) THEN
        ALTER TABLE menus
            ADD CONSTRAINT ck_menus_type CHECK (type BETWEEN 1 AND 5);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_role_menus_menu_id ON role_menus(menu_id);
