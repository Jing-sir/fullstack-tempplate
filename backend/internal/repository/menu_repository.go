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
		SELECT DISTINCT m.id, m.parent_id, m.name, m.title, m.type, m.icon, m.sort, m.status, m.created_at, m.updated_at
		FROM menus m
		INNER JOIN role_menus rm ON rm.menu_id = m.id
		WHERE rm.role_id IN (%s) AND m.status = 1
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
		return fmt.Errorf("update menu: %w", err)
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
