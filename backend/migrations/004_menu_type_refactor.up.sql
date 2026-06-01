-- 迁移：menus.type 枚举语义对齐 + 新增 type=3 隐藏路由页记录
-- 执行前检查：SELECT type, COUNT(*) FROM menus GROUP BY type;
--
-- 本数据库实际状态（执行前确认）：
--   type=1 (7条)：全为 parent_id=0 的根目录节点，语义已正确对齐为"目录"
--   type=2 (28条)：全为叶子菜单页，语义已正确对齐为"菜单页"
--   type=3/4：无数据（无按钮权限数据）
--
-- 因此无需重新分类存量数据，仅执行 Step3：插入三条 type=3 隐藏路由页记录。

-- Step 3：插入三条 type=3 隐藏路由页记录，挂在 rolePermissions 菜单页下
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
    ('viewRolePermissions',  '查看权限', 1),
    ('editRolePermissions',  '编辑角色', 2),
    ('addRolePermissions',   '新增角色', 3)
) AS sub(name, title, sort)
WHERE m.name = 'rolePermissions'
ON CONFLICT (name) DO NOTHING;

-- 验证查询（执行后手动确认）：
-- SELECT id, name, title, type, parent_id FROM menus ORDER BY type, parent_id, sort;
