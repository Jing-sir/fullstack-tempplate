-- 回滚：删除权限相关表，将 admin_users 重命名回 users

DROP TABLE IF EXISTS admin_user_roles;
DROP TABLE IF EXISTS role_menus;
DROP TABLE IF EXISTS menus;
DROP TABLE IF EXISTS roles;

ALTER TABLE admin_users RENAME TO users;
ALTER TABLE users RENAME CONSTRAINT uk_admin_users_uid      TO uk_users_uid;
ALTER TABLE users RENAME CONSTRAINT uk_admin_users_username TO uk_users_username;
