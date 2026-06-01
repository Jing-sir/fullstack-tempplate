-- 迁移：为 accountManage 补全 type=3 隐藏路由页记录
-- 对应前端路由：addAccount / editAccount（meta.isShow:true）

INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
SELECT
    m.id,
    sub.name,
    sub.title,
    3,
    '',
    sub.sort,
    1
FROM menus m
CROSS JOIN (VALUES
    ('addAccount',  '新增账号', 1),
    ('editAccount', '编辑账号', 2)
) AS sub(name, title, sort)
WHERE m.name = 'accountManage'
ON CONFLICT (name) DO NOTHING;

-- 验证：SELECT id, name, title, type, parent_id FROM menus WHERE parent_id = (SELECT id FROM menus WHERE name = 'accountManage');
