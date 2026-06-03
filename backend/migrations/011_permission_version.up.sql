-- 前端权限缓存主动失效：权限来源变化后递增，独立于 JWT 强制撤销版本号
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS permission_version BIGINT NOT NULL DEFAULT 1;
