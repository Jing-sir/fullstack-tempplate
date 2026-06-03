package service

import (
	"context"
	"errors"
	"fmt"

	"auth-service/internal/model"
)

// 菜单管理业务错误
var (
	ErrMenuNotFound         = errors.New("菜单不存在")
	ErrMenuNameTaken        = errors.New("菜单权限 key 已存在")
	ErrMenuTypeInvalid      = errors.New("菜单类型无效，合法值为 1=目录 2=菜单页 3=隐藏路由页 4=按钮 5=标签页")
	ErrMenuParentInvalid    = errors.New("父权限节点类型不匹配")
	ErrMenuHiddenNeedPage   = errors.New("隐藏路由页（type=3）必须挂在菜单页（type=2）节点下")
	ErrMenuButtonNeedParent = errors.New("按钮权限（type=4）必须挂在菜单页或标签页节点下")
)

// CreateMenuInput 新增菜单/按钮的请求参数
type CreateMenuInput struct {
	ParentID int64          `json:"parent_id"`
	Name     string         `json:"name"     binding:"required"` // 权限 key
	Title    string         `json:"title"    binding:"required"`
	Type     model.MenuType `json:"type"     binding:"required"` // 1=目录 2=菜单页 3=隐藏路由页 4=按钮 5=标签页
	Icon     string         `json:"icon"`
	Sort     int            `json:"sort"`
	Status   int            `json:"status"`
}

// UpdateMenuInput 更新菜单/按钮的请求参数
type UpdateMenuInput struct {
	ParentID int64          `json:"parent_id"`
	Name     string         `json:"name"  binding:"required"`
	Title    string         `json:"title" binding:"required"`
	Type     model.MenuType `json:"type"`
	Icon     string         `json:"icon"`
	Sort     int            `json:"sort"`
	Status   int            `json:"status"`
}

// MenuService 负责菜单和按钮权限的 CRUD 业务逻辑
type MenuService struct {
	menus MenuStore
}

// NewMenuService 构造 MenuService
func NewMenuService(menus MenuStore) *MenuService {
	return &MenuService{menus: menus}
}

// ListTree 返回完整菜单树（管理页用，非当前用户权限）
func (s *MenuService) ListTree(ctx context.Context) ([]*model.MenuTree, error) {
	menus, err := s.menus.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("list menus: %w", err)
	}
	return model.BuildMenuTree(menus), nil
}

// Create 新增菜单或按钮
func (s *MenuService) Create(ctx context.Context, input CreateMenuInput) (int64, error) {
	if err := s.validateParent(ctx, 0, input.ParentID, input.Type); err != nil {
		return 0, err
	}
	// 设置默认状态
	status := input.Status
	if status == 0 {
		status = 1
	}
	m := model.Menu{
		ParentID: input.ParentID,
		Name:     input.Name,
		Title:    input.Title,
		Type:     input.Type,
		Icon:     input.Icon,
		Sort:     input.Sort,
		Status:   status,
	}
	id, err := s.menus.Create(ctx, m)
	if err != nil {
		return 0, fmt.Errorf("create menu: %w", err)
	}
	return id, nil
}

// Update 更新菜单基本信息
func (s *MenuService) Update(ctx context.Context, id int64, input UpdateMenuInput) error {
	existing, err := s.menus.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get menu: %w", err)
	}
	if existing == nil {
		return ErrMenuNotFound
	}
	if err := s.validateParent(ctx, id, input.ParentID, input.Type); err != nil {
		return err
	}

	existing.ParentID = input.ParentID
	existing.Name = input.Name
	existing.Title = input.Title
	existing.Type = input.Type
	existing.Icon = input.Icon
	existing.Sort = input.Sort
	existing.Status = input.Status

	return s.menus.Update(ctx, *existing)
}

// Delete 删除菜单或按钮
func (s *MenuService) Delete(ctx context.Context, id int64) error {
	existing, err := s.menus.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get menu: %w", err)
	}
	if existing == nil {
		return ErrMenuNotFound
	}
	return s.menus.Delete(ctx, id)
}

func (s *MenuService) validateParent(ctx context.Context, id, parentID int64, menuType model.MenuType) error {
	if menuType < model.MenuTypeDir || menuType > model.MenuTypeTab {
		return ErrMenuTypeInvalid
	}
	if id != 0 && id == parentID {
		return ErrMenuParentInvalid
	}
	if parentID == 0 {
		if menuType == model.MenuTypeDir {
			return nil
		}
		if menuType == model.MenuTypeHidden {
			return ErrMenuHiddenNeedPage
		}
		if menuType == model.MenuTypeButton {
			return ErrMenuButtonNeedParent
		}
		return ErrMenuParentInvalid
	}

	parent, err := s.menus.GetByID(ctx, parentID)
	if err != nil {
		return fmt.Errorf("get parent menu: %w", err)
	}
	if parent == nil {
		return ErrMenuParentInvalid
	}
	visited := make(map[int64]struct{})
	for current := parent; current != nil && current.ID != 0; {
		if current.ID == id {
			return ErrMenuParentInvalid
		}
		if _, ok := visited[current.ID]; ok {
			return ErrMenuParentInvalid
		}
		visited[current.ID] = struct{}{}
		if current.ParentID == 0 {
			break
		}
		current, err = s.menus.GetByID(ctx, current.ParentID)
		if err != nil {
			return fmt.Errorf("get ancestor menu: %w", err)
		}
		if current == nil {
			return ErrMenuParentInvalid
		}
	}

	switch menuType {
	case model.MenuTypeDir:
		if parent.Type != model.MenuTypeDir {
			return ErrMenuParentInvalid
		}
	case model.MenuTypePage:
		if parent.Type != model.MenuTypeDir {
			return ErrMenuParentInvalid
		}
	case model.MenuTypeHidden:
		if parent.Type != model.MenuTypePage {
			return ErrMenuHiddenNeedPage
		}
	case model.MenuTypeButton:
		if parent.Type != model.MenuTypePage && parent.Type != model.MenuTypeTab {
			return ErrMenuButtonNeedParent
		}
	case model.MenuTypeTab:
		if parent.Type != model.MenuTypePage && parent.Type != model.MenuTypeTab {
			return ErrMenuParentInvalid
		}
	}
	return nil
}
