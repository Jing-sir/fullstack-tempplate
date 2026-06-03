package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"auth-service/internal/model"
)

// RoleRepository 封装 roles 及关联表的所有数据库操作
type RoleRepository struct {
	db *sql.DB
}

// NewRoleRepository 构造 RoleRepository
func NewRoleRepository(db *sql.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// GetAll 返回所有角色列表
func (r *RoleRepository) GetAll(ctx context.Context) ([]model.Role, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, title, description, status, created_at, updated_at
		FROM roles ORDER BY id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query roles: %w", err)
	}
	defer rows.Close()

	var roles []model.Role
	for rows.Next() {
		var role model.Role
		if err := scanRole(rows, &role); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %w", err)
	}
	return roles, nil
}

// GetByID 按 ID 查询角色，不存在时返回 nil, nil
func (r *RoleRepository) GetByID(ctx context.Context, id int64) (*model.Role, error) {
	var role model.Role
	err := scanRole(r.db.QueryRowContext(ctx, `
		SELECT id, name, title, description, status, created_at, updated_at
		FROM roles WHERE id = $1
	`, id), &role)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get role by id: %w", err)
	}
	return &role, nil
}

// GetByAdminUserID 返回指定管理员绑定的所有角色
func (r *RoleRepository) GetByAdminUserID(ctx context.Context, adminUserID int64) ([]model.Role, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.name, r.title, r.description, r.status, r.created_at, r.updated_at
		FROM roles r
		INNER JOIN admin_user_roles aur ON aur.role_id = r.id
		WHERE aur.admin_user_id = $1 AND r.status = 1
	`, adminUserID)
	if err != nil {
		return nil, fmt.Errorf("query roles by admin user id: %w", err)
	}
	defer rows.Close()

	var roles []model.Role
	for rows.Next() {
		var role model.Role
		if err := scanRole(rows, &role); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

// Create 新增角色，返回新记录 ID
func (r *RoleRepository) Create(ctx context.Context, role model.Role) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO roles (name, title, description, status)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, role.Name, role.Title, role.Description, role.Status).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("create role: %w", err)
	}
	return id, nil
}

// Update 更新角色基本信息
func (r *RoleRepository) Update(ctx context.Context, role model.Role) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		UPDATE roles SET name=$1, title=$2, description=$3, status=$4, updated_at=NOW() WHERE id=$5
	`, role.Name, role.Title, role.Description, role.Status, role.ID); err != nil {
		return fmt.Errorf("update role: %w", err)
	}
	if err := bumpPermissionVersionByRoleID(ctx, tx, role.ID); err != nil {
		return err
	}
	return tx.Commit()
}

// Delete 删除角色（级联删除 role_menus / admin_user_roles 关联记录）
func (r *RoleRepository) Delete(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := bumpPermissionVersionByRoleID(ctx, tx, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM roles WHERE id=$1", id); err != nil {
		return fmt.Errorf("delete role: %w", err)
	}
	return tx.Commit()
}

// SetMenus 批量覆盖角色的菜单权限（先删后插，在事务内完成）
func (r *RoleRepository) SetMenus(ctx context.Context, roleID int64, menuIDs []int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }() // 已 commit 后调用是 no-op

	// 删除该角色原有权限
	if _, err := tx.ExecContext(ctx, "DELETE FROM role_menus WHERE role_id=$1", roleID); err != nil {
		return fmt.Errorf("delete role menus: %w", err)
	}

	// 批量插入新权限
	for _, menuID := range menuIDs {
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO role_menus (role_id, menu_id) VALUES ($1, $2)", roleID, menuID,
		); err != nil {
			return fmt.Errorf("insert role menu: %w", err)
		}
	}
	if err := bumpPermissionVersionByRoleID(ctx, tx, roleID); err != nil {
		return err
	}

	return tx.Commit()
}

func bumpPermissionVersionByRoleID(ctx context.Context, tx *sql.Tx, roleID int64) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE admin_users
		SET permission_version=permission_version+1, updated_at=CURRENT_TIMESTAMP
		WHERE id IN (
			SELECT admin_user_id FROM admin_user_roles WHERE role_id=$1
		)
	`, roleID)
	if err != nil {
		return fmt.Errorf("bump permission version: %w", err)
	}
	return nil
}

// roleScanner 抽象 sql.Row 和 sql.Rows 的公共 Scan 接口
type roleScanner interface {
	Scan(dest ...any) error
}

func scanRole(s roleScanner, r *model.Role) error {
	return s.Scan(&r.ID, &r.Name, &r.Title, &r.Description, &r.Status, &r.CreatedAt, &r.UpdatedAt)
}
