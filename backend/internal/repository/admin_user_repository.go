package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"auth-service/internal/model"
)

// AdminUserRepository 封装 admin_users 表的所有数据库操作
type AdminUserRepository struct {
	db *sql.DB
}

// NewAdminUserRepository 构造 AdminUserRepository
func NewAdminUserRepository(db *sql.DB) *AdminUserRepository {
	return &AdminUserRepository{db: db}
}

// Create 将用户记录写入数据库
func (r *AdminUserRepository) Create(ctx context.Context, user model.AdminUser) error {
	query := `
		INSERT INTO admin_users (uid, username, real_name, email, phone, password, two_fa_enabled, status, avatar, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`
	_, err := r.db.ExecContext(
		ctx,
		query,
		user.UID,
		user.Username,
		user.RealName,
		user.Email,
		user.Phone,
		user.Password,
		user.TwoFAEnabled,
		user.Status,
		user.Avatar,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateKey
		}
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

// CreateWithRole 原子新增管理员并绑定角色
func (r *AdminUserRepository) CreateWithRole(ctx context.Context, user model.AdminUser, roleID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin create admin user transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	var userID int64
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO admin_users (
			uid, username, real_name, email, phone, password,
			two_fa_enabled, status, avatar, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id
	`, user.UID, user.Username, user.RealName, user.Email, user.Phone, user.Password,
		user.TwoFAEnabled, user.Status, user.Avatar).Scan(&userID); err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateKey
		}
		return fmt.Errorf("insert user: %w", err)
	}
	if roleID > 0 {
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES ($1, $2)",
			userID, roleID,
		); err != nil {
			return fmt.Errorf("insert user role: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit create admin user transaction: %w", err)
	}
	return nil
}

// CountByUsername 统计指定用户名的用户数量，用于判断用户名是否已被占用
func (r *AdminUserRepository) CountByUsername(ctx context.Context, username string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM admin_users WHERE username=$1", username).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count by username: %w", err)
	}
	return count, nil
}

// GetAll 返回所有用户，按 id 降序排列
func (r *AdminUserRepository) GetAll(ctx context.Context) ([]model.AdminUser, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, uid, username, real_name, email, phone, password, two_fa_enabled, two_fa_secret, status, token_version, permission_version, avatar, created_at, updated_at
		FROM admin_users
		ORDER BY id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var users []model.AdminUser
	for rows.Next() {
		var u model.AdminUser
		if err := scanAdminUser(rows, &u); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}

	return users, nil
}

// GetByUsername 按用户名查询用户，用户不存在时返回 nil, nil
func (r *AdminUserRepository) GetByUsername(ctx context.Context, username string) (*model.AdminUser, error) {
	query := `
		SELECT id, uid, username, real_name, email, phone, password, two_fa_enabled, two_fa_secret, status, token_version, permission_version, avatar, created_at, updated_at
		FROM admin_users
		WHERE username = $1
		LIMIT 1
	`
	var u model.AdminUser
	if err := scanAdminUser(r.db.QueryRowContext(ctx, query, username), &u); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get by username: %w", err)
	}
	return &u, nil
}

// GetByUID 按 UID 查询用户，用户不存在时返回 nil, nil
func (r *AdminUserRepository) GetByUID(ctx context.Context, uid string) (*model.AdminUser, error) {
	query := `
		SELECT id, uid, username, real_name, email, phone, password, two_fa_enabled, two_fa_secret, status, token_version, permission_version, avatar, created_at, updated_at
		FROM admin_users
		WHERE uid = $1
		LIMIT 1
	`
	var u model.AdminUser
	if err := scanAdminUser(r.db.QueryRowContext(ctx, query, uid), &u); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get by uid: %w", err)
	}
	return &u, nil
}

// GetByID 按 ID 查询用户，用户不存在时返回 nil, nil
func (r *AdminUserRepository) GetByID(ctx context.Context, id int64) (*model.AdminUser, error) {
	query := `
		SELECT id, uid, username, real_name, email, phone, password, two_fa_enabled, two_fa_secret, status, token_version, permission_version, avatar, created_at, updated_at
		FROM admin_users
		WHERE id = $1
		LIMIT 1
	`
	var u model.AdminUser
	if err := scanAdminUser(r.db.QueryRowContext(ctx, query, id), &u); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get by id: %w", err)
	}
	return &u, nil
}

// AdminUserFilter 管理员用户分页查询过滤条件
type AdminUserFilter struct {
	UID      string
	Account  string
	RealName string
	Page     int
	PageSize int
}

// AdminUserRow 管理员用户列表行（含角色信息）
type AdminUserRow struct {
	model.AdminUser
	RoleID   string
	RoleName string
}

// ListPage 分页查询管理员用户，含角色信息
func (r *AdminUserRepository) ListPage(ctx context.Context, f AdminUserFilter) ([]AdminUserRow, int64, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = 20
	}

	var (
		conditions []string
		args       []any
		idx        = 1
	)

	if f.UID != "" {
		conditions = append(conditions, fmt.Sprintf("u.uid = $%d", idx))
		args = append(args, f.UID)
		idx++
	}
	if f.Account != "" {
		conditions = append(conditions, fmt.Sprintf("u.username ILIKE $%d", idx))
		args = append(args, "%"+f.Account+"%")
		idx++
	}
	if f.RealName != "" {
		conditions = append(conditions, fmt.Sprintf("u.real_name ILIKE $%d", idx))
		args = append(args, "%"+f.RealName+"%")
		idx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	if err := r.db.QueryRowContext(ctx, fmt.Sprintf(`
		SELECT COUNT(*) FROM admin_users u %s
	`, where), countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count admin users: %w", err)
	}

	offset := (f.Page - 1) * f.PageSize
	query := fmt.Sprintf(`
		SELECT u.id, u.uid, u.username, u.real_name, u.email, u.phone, u.password,
		       u.two_fa_enabled, u.two_fa_secret, u.status, u.token_version, u.permission_version, u.avatar, u.created_at, u.updated_at,
		       COALESCE(r.id::text, '') AS role_id,
		       COALESCE(r.title, '') AS role_name
		FROM admin_users u
		LEFT JOIN admin_user_roles aur ON aur.admin_user_id = u.id
		LEFT JOIN roles r ON r.id = aur.role_id
		%s
		ORDER BY u.id DESC
		LIMIT $%d OFFSET $%d
	`, where, idx, idx+1)
	args = append(args, f.PageSize, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query admin users: %w", err)
	}
	defer rows.Close()

	var users []AdminUserRow
	for rows.Next() {
		var row AdminUserRow
		if err := rows.Scan(
			&row.ID, &row.UID, &row.Username, &row.RealName, &row.Email, &row.Phone, &row.Password,
			&row.TwoFAEnabled, &row.TwoFASecret, &row.Status, &row.TokenVersion, &row.PermissionVersion, &row.Avatar, &row.CreatedAt, &row.UpdatedAt,
			&row.RoleID, &row.RoleName,
		); err != nil {
			return nil, 0, fmt.Errorf("scan admin user row: %w", err)
		}
		users = append(users, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate admin users: %w", err)
	}
	return users, total, nil
}

// Update 更新管理员用户基本信息
func (r *AdminUserRepository) Update(ctx context.Context, user model.AdminUser) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE admin_users
		SET username=$1, real_name=$2, email=$3, phone=$4, status=$5, avatar=$6,
		    token_version=CASE WHEN status <> $5 THEN token_version + 1 ELSE token_version END,
		    updated_at=CURRENT_TIMESTAMP
		WHERE id=$7
	`, user.Username, user.RealName, user.Email, user.Phone, user.Status, user.Avatar, user.ID)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateKey
		}
		return fmt.Errorf("update admin user: %w", err)
	}
	return nil
}

// UpdateWithRole 原子更新管理员信息并按需替换角色
func (r *AdminUserRepository) UpdateWithRole(ctx context.Context, user model.AdminUser, roleID *int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin update admin user transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	const superadminMembershipLockKey int64 = 7_400_130_002
	if _, err := tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock($1)", superadminMembershipLockKey); err != nil {
		return fmt.Errorf("lock superadmin membership: %w", err)
	}

	var currentStatus int
	if err := tx.QueryRowContext(ctx,
		"SELECT status FROM admin_users WHERE id=$1 FOR UPDATE",
		user.ID,
	).Scan(&currentStatus); err != nil {
		return fmt.Errorf("lock admin user: %w", err)
	}

	var hadSuperadmin bool
	if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM admin_user_roles aur
			INNER JOIN roles r ON r.id = aur.role_id
			WHERE aur.admin_user_id=$1 AND r.name='superadmin'
		)
	`, user.ID).Scan(&hadSuperadmin); err != nil {
		return fmt.Errorf("check current superadmin role: %w", err)
	}

	hasSuperadminAfter := hadSuperadmin
	if roleID != nil {
		hasSuperadminAfter = false
		if *roleID > 0 {
			if err := tx.QueryRowContext(ctx,
				"SELECT name='superadmin' FROM roles WHERE id=$1",
				*roleID,
			).Scan(&hasSuperadminAfter); err != nil {
				return fmt.Errorf("check target role: %w", err)
			}
		}
	}

	if hadSuperadmin && currentStatus == 1 && (user.Status != 1 || !hasSuperadminAfter) {
		var remaining int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(DISTINCT u.id)
			FROM admin_users u
			INNER JOIN admin_user_roles aur ON aur.admin_user_id = u.id
			INNER JOIN roles r ON r.id = aur.role_id
			WHERE r.name='superadmin' AND r.status=1 AND u.status=1 AND u.id<>$1
		`, user.ID).Scan(&remaining); err != nil {
			return fmt.Errorf("count remaining superadmins: %w", err)
		}
		if remaining == 0 {
			return ErrLastSuperadmin
		}
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE admin_users
		SET username=$1, real_name=$2, email=$3, phone=$4, status=$5, avatar=$6,
		    token_version=CASE WHEN status <> $5 THEN token_version + 1 ELSE token_version END,
		    updated_at=CURRENT_TIMESTAMP
		WHERE id=$7
	`, user.Username, user.RealName, user.Email, user.Phone, user.Status, user.Avatar, user.ID); err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateKey
		}
		return fmt.Errorf("update admin user: %w", err)
	}

	if roleID != nil {
		if _, err := tx.ExecContext(ctx,
			"DELETE FROM admin_user_roles WHERE admin_user_id=$1",
			user.ID,
		); err != nil {
			return fmt.Errorf("delete user roles: %w", err)
		}
		if *roleID > 0 {
			if _, err := tx.ExecContext(ctx,
				"INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES ($1, $2)",
				user.ID, *roleID,
			); err != nil {
				return fmt.Errorf("insert user role: %w", err)
			}
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE admin_users
			SET permission_version=permission_version+1, updated_at=CURRENT_TIMESTAMP
			WHERE id=$1
		`, user.ID); err != nil {
			return fmt.Errorf("bump permission version: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit update admin user transaction: %w", err)
	}
	return nil
}

// UpdatePassword 更新管理员密码
func (r *AdminUserRepository) UpdatePassword(ctx context.Context, id int64, hashedPassword string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE admin_users SET password=$1, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$2",
		hashedPassword, id,
	)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

// ResetTwoFA 重置用户的 2FA 状态（清空密钥并禁用）
func (r *AdminUserRepository) ResetTwoFA(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE admin_users SET two_fa_secret=NULL, two_fa_enabled=FALSE, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1",
		id,
	)
	if err != nil {
		return fmt.Errorf("reset 2fa: %w", err)
	}
	return nil
}

// SetRole 为管理员绑定角色（先删后插，一个管理员一个角色）
func (r *AdminUserRepository) SetRole(ctx context.Context, adminUserID int64, roleID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, "DELETE FROM admin_user_roles WHERE admin_user_id=$1", adminUserID); err != nil {
		return fmt.Errorf("delete user roles: %w", err)
	}
	if roleID > 0 {
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES ($1, $2)", adminUserID, roleID,
		); err != nil {
			return fmt.Errorf("insert user role: %w", err)
		}
	}
	if _, err := tx.ExecContext(ctx,
		"UPDATE admin_users SET permission_version=permission_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1",
		adminUserID,
	); err != nil {
		return fmt.Errorf("bump permission version: %w", err)
	}
	return tx.Commit()
}

// UpdateTwoFASecret 保存用户的 TOTP 密钥，并将 two_fa_enabled 重置为 false（绑定尚未完成）
func (r *AdminUserRepository) UpdateTwoFASecret(ctx context.Context, userID int64, secret string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE admin_users SET two_fa_secret=$1, two_fa_enabled=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=$2",
		secret, userID,
	)
	if err != nil {
		return fmt.Errorf("update 2fa secret: %w", err)
	}
	return nil
}

// EnableTwoFA 将用户的 two_fa_enabled 标志置为 true，并使绑定前的受限 token 失效
func (r *AdminUserRepository) EnableTwoFA(ctx context.Context, userID int64) (int, error) {
	var tokenVersion int
	err := r.db.QueryRowContext(ctx,
		"UPDATE admin_users SET two_fa_enabled=TRUE, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING token_version",
		userID,
	).Scan(&tokenVersion)
	if err != nil {
		return 0, fmt.Errorf("enable 2fa: %w", err)
	}
	return tokenVersion, nil
}

// userScanner 抽象 sql.Row 和 sql.Rows 的公共 Scan 接口，便于复用 scanAdminUser
type userScanner interface {
	Scan(dest ...any) error
}

// scanAdminUser 将一行数据库结果扫描到 AdminUser 结构体
func scanAdminUser(scanner userScanner, u *model.AdminUser) error {
	return scanner.Scan(
		&u.ID,
		&u.UID,
		&u.Username,
		&u.RealName,
		&u.Email,
		&u.Phone,
		&u.Password,
		&u.TwoFAEnabled,
		&u.TwoFASecret,
		&u.Status,
		&u.TokenVersion,
		&u.PermissionVersion,
		&u.Avatar,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
}
