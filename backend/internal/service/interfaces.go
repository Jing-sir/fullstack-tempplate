package service

import (
	"context"
	"time"

	"auth-service/internal/model"
	"auth-service/internal/repository"
)

// TwoFASecurityStore 定义高风险 2FA challenge、限流和防重放存储
type TwoFASecurityStore interface {
	SaveChallenge(ctx context.Context, id string, userID int64, action, target string, ttl time.Duration) error
	IsBlocked(ctx context.Context, userID int64, limit int64) (bool, error)
	RecordFailure(ctx context.Context, userID int64, ttl time.Duration) (int64, error)
	ConsumeChallenge(
		ctx context.Context,
		id string,
		userID int64,
		action string,
		target string,
		counter int64,
		replayTTL time.Duration,
	) error
}

// UserStore 定义 service 层对管理员用户数据访问的依赖接口
type UserStore interface {
	// Create 将管理员用户写入数据库
	Create(ctx context.Context, user model.AdminUser) error
	// CreateWithRole 原子新增管理员并绑定角色
	CreateWithRole(ctx context.Context, user model.AdminUser, roleID int64) error
	// CountByUsername 统计指定用户名数量，用于判断是否重复
	CountByUsername(ctx context.Context, username string) (int, error)
	// GetAll 返回所有管理员用户列表
	GetAll(ctx context.Context) ([]model.AdminUser, error)
	// GetByUsername 按用户名查询，不存在时返回 nil, nil
	GetByUsername(ctx context.Context, username string) (*model.AdminUser, error)
	// GetByUID 按 UID 查询，不存在时返回 nil, nil
	GetByUID(ctx context.Context, uid string) (*model.AdminUser, error)
	// GetByID 按 ID 查询，不存在时返回 nil, nil
	GetByID(ctx context.Context, id int64) (*model.AdminUser, error)
	// UpdateTwoFASecret 更新 TOTP 密钥，同时将 two_fa_enabled 置为 false
	UpdateTwoFASecret(ctx context.Context, userID int64, secret string) error
	// EnableTwoFA 启用 2FA 并返回递增后的 token_version
	EnableTwoFA(ctx context.Context, userID int64) (int, error)
	// Update 更新管理员用户基本信息
	Update(ctx context.Context, user model.AdminUser) error
	// UpdateWithRole 原子更新管理员信息并按需替换角色
	UpdateWithRole(ctx context.Context, user model.AdminUser, roleID *int64) error
	// UpdatePassword 更新管理员密码
	UpdatePassword(ctx context.Context, id int64, hashedPassword string) error
	// ResetTwoFA 重置 2FA 状态
	ResetTwoFA(ctx context.Context, id int64) error
	// SetRole 为管理员绑定角色
	SetRole(ctx context.Context, adminUserID int64, roleID int64) error
	// ListPage 分页查询管理员用户（含角色）
	ListPage(ctx context.Context, f repository.AdminUserFilter) ([]repository.AdminUserRow, int64, error)
}

// MenuStore 定义 service 层对菜单数据访问的依赖接口
type MenuStore interface {
	// GetAll 返回所有菜单（含按钮），用于构建完整权限树
	GetAll(ctx context.Context) ([]model.Menu, error)
	// GetByID 按 ID 查询菜单，不存在时返回 nil, nil
	GetByID(ctx context.Context, id int64) (*model.Menu, error)
	// GetByRoleIDs 返回指定角色列表所拥有菜单权限的并集
	GetByRoleIDs(ctx context.Context, roleIDs []int64) ([]model.Menu, error)
	// GetMenuIDsByRoleID 返回指定角色已授权的菜单 ID 列表
	GetMenuIDsByRoleID(ctx context.Context, roleID int64) ([]int64, error)
	// CreateWithRoleGrantAndVersionBump 原子新增节点、授权角色并递增权限版本
	CreateWithRoleGrantAndVersionBump(ctx context.Context, m model.Menu, roleName string) (int64, error)
	// UpdateWithVersionBump 原子更新节点并递增权限版本
	UpdateWithVersionBump(ctx context.Context, m model.Menu) error
	// UpdateStatusWithVersionBump 原子更新节点状态并递增权限版本
	UpdateStatusWithVersionBump(ctx context.Context, id int64, status int) error
	// MoveWithVersionBump 原子移动节点并递增权限版本
	MoveWithVersionBump(ctx context.Context, id int64, parentID int64, sort int) error
	// CountChildren 统计直接子节点数量
	CountChildren(ctx context.Context, id int64) (int, error)
	// DeleteWithVersionBump 原子删除节点及后代并递增权限版本
	DeleteWithVersionBump(ctx context.Context, id int64) error
}

// RoleStore 定义 service 层对角色数据访问的依赖接口
type RoleStore interface {
	// GetAll 返回所有角色列表
	GetAll(ctx context.Context) ([]model.Role, error)
	// GetByID 按 ID 查询角色，不存在时返回 nil, nil
	GetByID(ctx context.Context, id int64) (*model.Role, error)
	// GetByName 按角色标识查询，不存在时返回 nil, nil
	GetByName(ctx context.Context, name string) (*model.Role, error)
	// GetByAdminUserID 返回指定管理员绑定的所有角色
	GetByAdminUserID(ctx context.Context, adminUserID int64) ([]model.Role, error)
	// Create 新增角色，返回新记录 ID
	Create(ctx context.Context, role model.Role) (int64, error)
	// CreateWithMenus 原子新增角色并写入权限集合
	CreateWithMenus(ctx context.Context, role model.Role, menuIDs []int64) (int64, error)
	// Update 更新角色基本信息
	Update(ctx context.Context, role model.Role) error
	// UpdateWithMenus 原子更新角色基本信息和权限集合
	UpdateWithMenus(ctx context.Context, role model.Role, menuIDs []int64) error
	// Delete 删除角色
	Delete(ctx context.Context, id int64) error
	// SetMenus 批量覆盖角色的菜单权限
	SetMenus(ctx context.Context, roleID int64, menuIDs []int64) error
}
