-- 迁移：为 rolePermissions 和 accountManage 补全 type=4 按钮权限记录
-- type=4 按钮：name 格式为 routeName-action，无路由，挂在对应菜单页下

-- rolePermissions 下的按钮权限
INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT
    m.id,
    sub.name,
    sub.title,
    4,
    '',
    sub.sort,
    1
FROM menus m
CROSS JOIN (VALUES
    ('rolePermissions-add', '新增角色', 1)
) AS sub(name, title, sort)
WHERE m.name = 'rolePermissions'
ON CONFLICT (name) DO NOTHING;

-- accountManage 下的按钮权限
INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT
    m.id,
    sub.name,
    sub.title,
    4,
    '',
    sub.sort,
    1
FROM menus m
CROSS JOIN (VALUES
    ('accountManage-add',     '新增管理员', 1),
    ('accountManage-disable', '启用/禁用',  2)
) AS sub(name, title, sort)
WHERE m.name = 'accountManage'
ON CONFLICT (name) DO NOTHING;

-- 验证：
-- SELECT id, name, title, type, parent_id FROM menus WHERE type = 4 ORDER BY parent_id, sort;
