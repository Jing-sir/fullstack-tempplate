-- 回滚管理员姓名字段。
ALTER TABLE admin_users
DROP COLUMN IF EXISTS real_name;
