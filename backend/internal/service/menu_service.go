package service

import (
	"context"
	"errors"
	"fmt"

	"auth-service/internal/model"
	"auth-service/internal/repository"
)

// 菜单管理业务错误
var (
	ErrMenuNotFound          = errors.New("菜单不存在")
	ErrMenuNameTaken         = errors.New("菜单权限 key 已存在")
	ErrMenuNameImmutable     = errors.New("权限 key 创建后不可修改")
	ErrMenuTypeInvalid       = errors.New("菜单类型无效，合法值为 1=目录 2=菜单页 3=隐藏路由页 4=按钮 5=标签页")
	ErrMenuParentInvalid     = errors.New("父权限节点类型不匹配")
	ErrMenuHiddenNeedPage    = errors.New("隐藏路由页（type=3）必须挂在菜单页（type=2）节点下")
	ErrMenuButtonNeedParent  = errors.New("按钮权限（type=4）必须挂在菜单页或标签页节点下")
	ErrMenuHasChildren       = errors.New("权限节点存在子节点，请确认级联删除")
	ErrMenuChildrenInvalid   = errors.New("当前节点类型不能承载已有子权限，请先调整子节点")
	ErrMenuStatusInvalid     = errors.New("权限节点状态仅支持启用或禁用")
	ErrSystemMenuProtected   = errors.New("系统权限节点不可删除、禁用、移动或改变层级类型")
	ErrSystemRoleUnavailable = errors.New("系统角色不存在，无法创建权限节点")
)

var systemPermissionKeys = map[string]struct{}{
	"systemManage":                {},
	"operationLog":                {},
	"rolePermissions":             {},
	"rolePermissions-add":         {},
	"rolePermissions-view":        {},
	"rolePermissions-edit":        {},
	"rolePermissions-delete":      {},
	"rolePermissions-menuManage":  {},
	"accountManage":               {},
	"accountManage-add":           {},
	"accountManage-edit":          {},
	"accountManage-disable":       {},
	"accountManage-resetPassword": {},
	"accountManage-reset2FA":      {},
}

// CreateMenuInput 新增菜单/按钮的请求参数
type CreateMenuInput struct {
	ParentID      int64          `json:"parent_id"`
	Name          string         `json:"name"     binding:"required"` // 权限 key
	Title         string         `json:"title"    binding:"required"`
	Type          model.MenuType `json:"type"     binding:"required"` // 1=目录 2=菜单页 3=隐藏路由页 4=按钮 5=标签页
	Icon          string         `json:"icon"`
	Sort          int            `json:"sort"`
	Status        *int           `json:"status"`
	FACode        string         `json:"facode"   binding:"required"` // 当前操作者 2FA 验证码
	FAChallengeID string         `json:"fa_challenge_id" binding:"required"`
}

// UpdateMenuInput 更新菜单/按钮的请求参数
type UpdateMenuInput struct {
	ParentID      int64          `json:"parent_id"`
	Name          string         `json:"name"  binding:"required"`
	Title         string         `json:"title" binding:"required"`
	Type          model.MenuType `json:"type"`
	Icon          string         `json:"icon"`
	Sort          int            `json:"sort"`
	Status        int            `json:"status"`
	FACode        string         `json:"facode" binding:"required"` // 当前操作者 2FA 验证码
	FAChallengeID string         `json:"fa_challenge_id" binding:"required"`
}

// MoveMenuInput 移动菜单/按钮父级和排序的请求参数
type MoveMenuInput struct {
	ParentID int64 `json:"parent_id"`
	Sort     int   `json:"sort"`
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
	tree := model.BuildMenuTree(menus)
	markProtectedMenus(tree)
	return tree, nil
}

func markProtectedMenus(nodes []*model.MenuTree) {
	for _, node := range nodes {
		node.Protected = isSystemPermission(node.Name)
		markProtectedMenus(node.Children)
	}
}

// Create 新增菜单或按钮
func (s *MenuService) Create(ctx context.Context, input CreateMenuInput) (int64, error) {
	status := 1
	if input.Status != nil {
		status = *input.Status
	}
	if err := validateMenuStatus(status); err != nil {
		return 0, err
	}
	if err := s.validateParent(ctx, 0, input.ParentID, input.Type); err != nil {
		return 0, err
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
	id, err := s.menus.CreateWithRoleGrantAndVersionBump(ctx, m, "superadmin")
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return 0, ErrMenuNameTaken
		}
		if errors.Is(err, repository.ErrReferencedRoleNotFound) {
			return 0, ErrSystemRoleUnavailable
		}
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
	if input.Name != existing.Name {
		return ErrMenuNameImmutable
	}
	if isSystemPermission(existing.Name) &&
		(input.ParentID != existing.ParentID || input.Type != existing.Type || input.Status != 1) {
		return ErrSystemMenuProtected
	}
	if err := validateMenuStatus(input.Status); err != nil {
		return err
	}
	if err := s.validateParent(ctx, id, input.ParentID, input.Type); err != nil {
		return err
	}
	if err := s.validateChildren(ctx, id, input.Type); err != nil {
		return err
	}

	existing.ParentID = input.ParentID
	existing.Title = input.Title
	existing.Type = input.Type
	existing.Icon = input.Icon
	existing.Sort = input.Sort
	existing.Status = input.Status

	if err := s.menus.UpdateWithVersionBump(ctx, *existing); err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return ErrMenuNameTaken
		}
		if errors.Is(err, repository.ErrMenuCycle) {
			return ErrMenuParentInvalid
		}
		return fmt.Errorf("update menu: %w", err)
	}
	return nil
}

// UpdateStatus 更新菜单状态
func (s *MenuService) UpdateStatus(ctx context.Context, id int64, status int) error {
	if err := validateMenuStatus(status); err != nil {
		return err
	}
	existing, err := s.menus.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get menu: %w", err)
	}
	if existing == nil {
		return ErrMenuNotFound
	}
	if isSystemPermission(existing.Name) && status != 1 {
		return ErrSystemMenuProtected
	}
	if err := s.menus.UpdateStatusWithVersionBump(ctx, id, status); err != nil {
		return fmt.Errorf("update menu status: %w", err)
	}
	return nil
}

// Move 移动菜单父级并更新排序
func (s *MenuService) Move(ctx context.Context, id int64, input MoveMenuInput) error {
	existing, err := s.menus.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get menu: %w", err)
	}
	if existing == nil {
		return ErrMenuNotFound
	}
	if isSystemPermission(existing.Name) {
		return ErrSystemMenuProtected
	}
	if err := s.validateParent(ctx, id, input.ParentID, existing.Type); err != nil {
		return err
	}
	if err := s.menus.MoveWithVersionBump(ctx, id, input.ParentID, input.Sort); err != nil {
		if errors.Is(err, repository.ErrMenuCycle) {
			return ErrMenuParentInvalid
		}
		return fmt.Errorf("move menu: %w", err)
	}
	return nil
}

// Delete 删除菜单或按钮
func (s *MenuService) Delete(ctx context.Context, id int64, cascade bool) error {
	existing, err := s.menus.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get menu: %w", err)
	}
	if existing == nil {
		return ErrMenuNotFound
	}
	if isSystemPermission(existing.Name) {
		return ErrSystemMenuProtected
	}
	if !cascade {
		count, err := s.menus.CountChildren(ctx, id)
		if err != nil {
			return fmt.Errorf("count children: %w", err)
		}
		if count > 0 {
			return ErrMenuHasChildren
		}
	}
	if err := s.menus.DeleteWithVersionBump(ctx, id); err != nil {
		return err
	}
	return nil
}

func isSystemPermission(name string) bool {
	_, ok := systemPermissionKeys[name]
	return ok
}

func validateMenuStatus(status int) error {
	if status != 0 && status != 1 {
		return ErrMenuStatusInvalid
	}
	return nil
}

func (s *MenuService) validateChildren(ctx context.Context, id int64, parentType model.MenuType) error {
	menus, err := s.menus.GetAll(ctx)
	if err != nil {
		return fmt.Errorf("list menu children: %w", err)
	}
	for _, child := range menus {
		if child.ParentID == id && !canContainMenuType(parentType, child.Type) {
			return ErrMenuChildrenInvalid
		}
	}
	return nil
}

func canContainMenuType(parentType, childType model.MenuType) bool {
	switch childType {
	case model.MenuTypeDir, model.MenuTypePage:
		return parentType == model.MenuTypeDir
	case model.MenuTypeHidden:
		return parentType == model.MenuTypePage
	case model.MenuTypeButton, model.MenuTypeTab:
		return parentType == model.MenuTypePage || parentType == model.MenuTypeTab
	default:
		return false
	}
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

	if canContainMenuType(parent.Type, menuType) {
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
