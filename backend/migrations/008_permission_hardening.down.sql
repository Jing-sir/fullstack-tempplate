-- 回滚 JWT 服务端撤销版本号
ALTER TABLE admin_users
DROP COLUMN IF EXISTS token_version;
