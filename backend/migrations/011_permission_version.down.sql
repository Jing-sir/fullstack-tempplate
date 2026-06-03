-- 回滚前端权限缓存主动失效版本号
ALTER TABLE admin_users
DROP COLUMN IF EXISTS permission_version;
