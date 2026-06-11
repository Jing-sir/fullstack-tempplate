-- 权限验证中心：用于验收目录、列表页、隐藏页、Tab 和按钮权限。

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
VALUES (0, 'permissionLab', '权限验证中心', 1, 'rolePermissions', 20, 1)
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT root.id, 'permissionLabOrders', '订单权限样例', 2, '', 10, 1
FROM menus root
WHERE root.name = 'permissionLab'
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT page.id, child.name, child.title, child.type, '', child.sort, 1
FROM menus page
CROSS JOIN (VALUES
    ('permissionLabOrders-detail',       '订单详情', 3, 10),
    ('permissionLabOrders-add',          '新增订单', 4, 20),
    ('permissionLabOrders-export',       '导出订单', 4, 30),
    ('permissionLabOrders-edit',         '编辑订单', 4, 40),
    ('permissionLabOrders-delete',       '删除订单', 4, 50),
    ('permissionLabOrders-tabAll',       '全部订单', 5, 60),
    ('permissionLabOrders-tabReview',    '待审核',   5, 70),
    ('permissionLabOrders-tabCompleted', '已完成',   5, 80)
) AS child(name, title, type, sort)
WHERE page.name = 'permissionLabOrders'
ON CONFLICT (name) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = 1,
    updated_at = NOW();

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT tab.id, child.name, child.title, 4, '', child.sort, 1
FROM menus tab
JOIN (VALUES
    ('permissionLabOrders-tabReview', 'permissionLabOrders-approve', '审核通过', 10),
    ('permissionLabOrders-tabReview', 'permissionLabOrders-reject',  '审核驳回', 20),
    ('permissionLabOrders-tabCompleted', 'permissionLabOrders-reopen', '重新打开', 10)
) AS child(parent_name, name, title, sort)
ON tab.name = child.parent_name
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
  AND (
      m.name = 'permissionLab'
      OR m.name = 'permissionLabOrders'
      OR m.name LIKE 'permissionLabOrders-%'
  )
ON CONFLICT DO NOTHING;

UPDATE admin_users
SET permission_version = permission_version + 1,
    updated_at = NOW();
