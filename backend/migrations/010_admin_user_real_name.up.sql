-- 管理员姓名：账号登录名与人员姓名分离，支持账号列表展示和按姓名筛选。
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS real_name VARCHAR(64) NOT NULL DEFAULT '';

-- 存量账号没有姓名时先回填登录名，避免升级后列表出现空值。
UPDATE admin_users
SET real_name = username
WHERE real_name = '';
