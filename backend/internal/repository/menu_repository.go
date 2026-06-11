package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"auth-service/internal/model"
)

// MenuRepository 封装 menus 表的所有数据库操作
type MenuRepository struct {
	db *sql.DB
}

// NewMenuRepository 构造 MenuRepository
func NewMenuRepository(db *sql.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

// GetAll 返回所有菜单（含按钮），按 sort 升序排列，供 BuildMenuTree 构建树形结构
func (r *MenuRepository) GetAll(ctx context.Context) ([]model.Menu, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, parent_id, name, title, type, icon, sort, status, created_at, updated_at
		FROM menus
		ORDER BY sort ASC, id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query menus: %w", err)
	}
	defer rows.Close()

	var menus []model.Menu
	for rows.Next() {
		var m model.Menu
		if err := scanMenu(rows, &m); err != nil {
			return nil, fmt.Errorf("scan menu: %w", err)
		}
		menus = append(menus, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate menus: %w", err)
	}
	return menus, nil
}

// GetByID 按 ID 查询菜单，不存在时返回 nil, nil
func (r *MenuRepository) GetByID(ctx context.Context, id int64) (*model.Menu, error) {
	var m model.Menu
	err := scanMenu(r.db.QueryRowContext(ctx, `
		SELECT id, parent_id, name, title, type, icon, sort, status, created_at, updated_at
		FROM menus WHERE id = $1
	`, id), &m)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get menu by id: %w", err)
	}
	return &m, nil
}

// GetByRoleIDs 返回指定角色 ID 列表所拥有的所有菜单权限（取并集，去重）
func (r *MenuRepository) GetByRoleIDs(ctx context.Context, roleIDs []int64) ([]model.Menu, error) {
	if len(roleIDs) == 0 {
		return nil, nil
	}

	// 构造 IN 占位符：($1,$2,...)
	placeholders := make([]byte, 0, len(roleIDs)*4)
	args := make([]any, 0, len(roleIDs))
	for i, id := range roleIDs {
		if i > 0 {
			placeholders = append(placeholders, ',')
		}
		placeholders = fmt.Appendf(placeholders, "$%d", i+1)
		args = append(args, id)
	}

	query := fmt.Sprintf(`
		WITH RECURSIVE enabled_menus AS (
			SELECT id, parent_id, name, title, type, icon, sort, status, created_at, updated_at
			FROM menus
			WHERE parent_id = 0 AND status = 1
			UNION ALL
			SELECT child.id, child.parent_id, child.name, child.title, child.type,
			       child.icon, child.sort, child.status, child.created_at, child.updated_at
			FROM menus child
			INNER JOIN enabled_menus parent ON child.parent_id = parent.id
			WHERE child.status = 1
		)
		SELECT DISTINCT m.id, m.parent_id, m.name, m.title, m.type, m.icon, m.sort, m.status, m.created_at, m.updated_at
		FROM enabled_menus m
		INNER JOIN role_menus rm ON rm.menu_id = m.id
		WHERE rm.role_id IN (%s)
		ORDER BY m.sort ASC, m.id ASC
	`, placeholders)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query menus by role ids: %w", err)
	}
	defer rows.Close()

	var menus []model.Menu
	for rows.Next() {
		var m model.Menu
		if err := scanMenu(rows, &m); err != nil {
			return nil, fmt.Errorf("scan menu: %w", err)
		}
		menus = append(menus, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate menus: %w", err)
	}
	return menus, nil
}

// GetMenuIDsByRoleID 返回指定角色已授权的菜单 ID 列表
func (r *MenuRepository) GetMenuIDsByRoleID(ctx context.Context, roleID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT menu_id FROM role_menus WHERE role_id = $1", roleID)
	if err != nil {
		return nil, fmt.Errorf("get menu ids by role id: %w", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan menu id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// Create 新增菜单或按钮，返回新记录 ID
func (r *MenuRepository) Create(ctx context.Context, m model.Menu) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, m.ParentID, m.Name, m.Title, m.Type, m.Icon, m.Sort, m.Status).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return 0, ErrDuplicateKey
		}
		return 0, fmt.Errorf("create menu: %w", err)
	}
	return id, nil
}

// Update 更新菜单基本信息
func (r *MenuRepository) Update(ctx context.Context, m model.Menu) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE menus
		SET parent_id=$1, name=$2, title=$3, type=$4, icon=$5, sort=$6, status=$7, updated_at=NOW()
		WHERE id=$8
	`, m.ParentID, m.Name, m.Title, m.Type, m.Icon, m.Sort, m.Status, m.ID)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateKey
		}
		return fmt.Errorf("update menu: %w", err)
	}
	return nil
}

// CountChildren 统计直接子节点数量
func (r *MenuRepository) CountChildren(ctx context.Context, id int64) (int, error) {
	var count int
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM menus WHERE parent_id=$1
	`, id).Scan(&count); err != nil {
		return 0, fmt.Errorf("count menu children: %w", err)
	}
	return count, nil
}

// CreateWithRoleGrantAndVersionBump 原子新增节点、授权角色并递增权限版本
func (r *MenuRepository) CreateWithRoleGrantAndVersionBump(ctx context.Context, m model.Menu, roleName string) (int64, error) {
	var id int64
	err := r.runMutation(ctx, func(tx *sql.Tx) error {
		if err := tx.QueryRowContext(ctx, `
			INSERT INTO menus (parent_id, name, title, type, icon, sort, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
		`, m.ParentID, m.Name, m.Title, m.Type, m.Icon, m.Sort, m.Status).Scan(&id); err != nil {
			if isUniqueViolation(err) {
				return ErrDuplicateKey
			}
			return fmt.Errorf("create menu: %w", err)
		}
		result, err := tx.ExecContext(ctx, `
			INSERT INTO role_menus (role_id, menu_id)
			SELECT id, $2 FROM roles WHERE name=$1
			ON CONFLICT DO NOTHING
		`, roleName, id)
		if err != nil {
			return fmt.Errorf("grant menu to role: %w", err)
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("count granted menu rows: %w", err)
		}
		if affected != 1 {
			return ErrReferencedRoleNotFound
		}
		return nil
	})
	return id, err
}

// UpdateWithVersionBump 原子更新节点并递增权限版本
func (r *MenuRepository) UpdateWithVersionBump(ctx context.Context, m model.Menu) error {
	return r.runMutation(ctx, func(tx *sql.Tx) error {
		if err := lockMenuTree(ctx, tx); err != nil {
			return err
		}
		if err := validateMenuMove(ctx, tx, m.ID, m.ParentID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE menus
			SET parent_id=$1, title=$2, type=$3, icon=$4, sort=$5, status=$6, updated_at=NOW()
			WHERE id=$7
		`, m.ParentID, m.Title, m.Type, m.Icon, m.Sort, m.Status, m.ID)
		if err != nil {
			if isUniqueViolation(err) {
				return ErrDuplicateKey
			}
			return fmt.Errorf("update menu: %w", err)
		}
		return nil
	})
}

// UpdateStatusWithVersionBump 原子更新节点状态并递增权限版本
func (r *MenuRepository) UpdateStatusWithVersionBump(ctx context.Context, id int64, status int) error {
	return r.runMutation(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			UPDATE menus SET status=$1, updated_at=NOW() WHERE id=$2
		`, status, id); err != nil {
			return fmt.Errorf("update menu status: %w", err)
		}
		return nil
	})
}

// MoveWithVersionBump 原子移动节点并递增权限版本
func (r *MenuRepository) MoveWithVersionBump(ctx context.Context, id int64, parentID int64, sort int) error {
	return r.runMutation(ctx, func(tx *sql.Tx) error {
		if err := lockMenuTree(ctx, tx); err != nil {
			return err
		}
		if err := validateMenuMove(ctx, tx, id, parentID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE menus SET parent_id=$1, sort=$2, updated_at=NOW() WHERE id=$3
		`, parentID, sort, id); err != nil {
			return fmt.Errorf("move menu: %w", err)
		}
		return nil
	})
}

// DeleteWithVersionBump 原子删除节点及后代并递增权限版本
func (r *MenuRepository) DeleteWithVersionBump(ctx context.Context, id int64) error {
	return r.runMutation(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			WITH RECURSIVE descendants AS (
				SELECT id FROM menus WHERE id = $1
				UNION
				SELECT m.id
				FROM menus m
				INNER JOIN descendants d ON m.parent_id = d.id
			)
			DELETE FROM menus WHERE id IN (SELECT id FROM descendants)
		`, id); err != nil {
			return fmt.Errorf("delete menu: %w", err)
		}
		return nil
	})
}

func lockMenuTree(ctx context.Context, tx *sql.Tx) error {
	const menuTreeLockKey int64 = 7_400_130_001
	if _, err := tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock($1)", menuTreeLockKey); err != nil {
		return fmt.Errorf("lock menu tree: %w", err)
	}
	return nil
}

func validateMenuMove(ctx context.Context, tx *sql.Tx, id, parentID int64) error {
	if parentID == 0 {
		return nil
	}

	var createsCycle bool
	if err := tx.QueryRowContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM menus WHERE id = $1
			UNION
			SELECT child.id
			FROM menus child
			INNER JOIN descendants parent ON child.parent_id = parent.id
		)
		SELECT EXISTS(SELECT 1 FROM descendants WHERE id = $2)
	`, id, parentID).Scan(&createsCycle); err != nil {
		return fmt.Errorf("validate menu move: %w", err)
	}
	if createsCycle {
		return ErrMenuCycle
	}
	return nil
}

func (r *MenuRepository) runMutation(ctx context.Context, mutate func(*sql.Tx) error) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin menu mutation: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := mutate(tx); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE admin_users
		SET permission_version=permission_version+1, updated_at=CURRENT_TIMESTAMP
	`); err != nil {
		return fmt.Errorf("bump all permission versions: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit menu mutation: %w", err)
	}
	return nil
}

// Delete 删除菜单及全部后代节点。menus.parent_id 使用 0 表示根节点，
// 因此层级级联由递归 CTE 显式完成，role_menus 再由外键自动清理。
func (r *MenuRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM menus WHERE id = $1
			UNION
			SELECT m.id
			FROM menus m
			INNER JOIN descendants d ON m.parent_id = d.id
		)
		DELETE FROM menus WHERE id IN (SELECT id FROM descendants)
	`, id)
	if err != nil {
		return fmt.Errorf("delete menu: %w", err)
	}
	return nil
}

// menuScanner 抽象 sql.Row 和 sql.Rows 的公共 Scan 接口
type menuScanner interface {
	Scan(dest ...any) error
}

func scanMenu(s menuScanner, m *model.Menu) error {
	return s.Scan(&m.ID, &m.ParentID, &m.Name, &m.Title, &m.Type,
		&m.Icon, &m.Sort, &m.Status, &m.CreatedAt, &m.UpdatedAt)
}
