-- 回滚：删除 accountManage 下的 type=3 隐藏路由页记录
DELETE FROM menus
WHERE name IN ('addAccount', 'editAccount')
  AND type = 3;
