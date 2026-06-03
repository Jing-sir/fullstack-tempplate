-- 权限安全加固：为管理员 JWT 增加服务端可撤销版本号
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
