package service

import (
	"context"
	"errors"
	"fmt"

	"auth-service/internal/model"
	"auth-service/internal/repository"
)

// 角色管理业务错误
var (
	ErrRoleNotFound        = errors.New("角色不存在")
	ErrRoleNameTaken       = errors.New("角色标识已存在")
	ErrSystemRoleProtected = errors.New("系统角色不可重命名、禁用、删除或修改权限")
)

const systemRoleName = "superadmin"

// CreateRoleInput 新增角色的请求参数
type CreateRoleInput struct {
	Name        string `json:"name"  binding:"required"` // 角色标识，英文
	Title       string `json:"title" binding:"required"` // 显示名称，中文
	Description string `json:"description"`
	Status      int    `json:"status"`
}

// UpdateRoleInput 更新角色的请求参数
type UpdateRoleInput struct {
	Name        string `json:"name"  binding:"required"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Status      int    `json:"status"`
}

// RoleService 负责角色 CRUD 和权限分配的业务逻辑
type RoleService struct {
	roles RoleStore
	menus MenuStore
}

// NewRoleService 构造 RoleService
func NewRoleService(roles RoleStore, menus MenuStore) *RoleService {
	return &RoleService{roles: roles, menus: menus}
}

// GetByID 获取单个角色详情
func (s *RoleService) GetByID(ctx context.Context, id int64) (*model.Role, error) {
	role, err := s.roles.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get role: %w", err)
	}
	if role == nil {
		return nil, ErrRoleNotFound
	}
	return role, nil
}

// List 返回所有角色列表
func (s *RoleService) List(ctx context.Context) ([]model.Role, error) {
	roles, err := s.roles.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	return roles, nil
}

// Create 新增角色
func (s *RoleService) Create(ctx context.Context, input CreateRoleInput) (int64, error) {
	status := input.Status
	if status == 0 {
		status = 1
	}
	id, err := s.roles.Create(ctx, model.Role{
		Name:        input.Name,
		Title:       input.Title,
		Description: input.Description,
		Status:      status,
	})
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return 0, ErrRoleNameTaken
		}
		return 0, fmt.Errorf("create role: %w", err)
	}
	return id, nil
}

// CreateWithMenus 原子新增角色并写入权限集合
func (s *RoleService) CreateWithMenus(ctx context.Context, input CreateRoleInput, menuIDs []int64) (int64, error) {
	normalizedMenuIDs, err := s.normalizeMenuIDs(ctx, menuIDs)
	if err != nil {
		return 0, err
	}
	status := input.Status
	if status == 0 {
		status = 1
	}
	id, err := s.roles.CreateWithMenus(ctx, model.Role{
		Name:        input.Name,
		Title:       input.Title,
		Description: input.Description,
		Status:      status,
	}, normalizedMenuIDs)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return 0, ErrRoleNameTaken
		}
		return 0, fmt.Errorf("create role with menus: %w", err)
	}
	return id, nil
}

// Update 更新角色基本信息
func (s *RoleService) Update(ctx context.Context, id int64, input UpdateRoleInput) error {
	existing, err := s.roles.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get role: %w", err)
	}
	if existing == nil {
		return ErrRoleNotFound
	}
	if existing.Name == systemRoleName && (input.Name != existing.Name || input.Status != 1) {
		return ErrSystemRoleProtected
	}

	existing.Name = input.Name
	existing.Title = input.Title
	existing.Description = input.Description
	existing.Status = input.Status

	if err := s.roles.Update(ctx, *existing); err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return ErrRoleNameTaken
		}
		return fmt.Errorf("update role: %w", err)
	}
	return nil
}

// UpdateWithMenus 原子更新角色基本信息和权限集合
func (s *RoleService) UpdateWithMenus(ctx context.Context, id int64, input UpdateRoleInput, menuIDs []int64) error {
	existing, err := s.roles.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get role: %w", err)
	}
	if existing == nil {
		return ErrRoleNotFound
	}
	if existing.Name == systemRoleName {
		return ErrSystemRoleProtected
	}
	normalizedMenuIDs, err := s.normalizeMenuIDs(ctx, menuIDs)
	if err != nil {
		return err
	}

	existing.Name = input.Name
	existing.Title = input.Title
	existing.Description = input.Description
	existing.Status = input.Status
	if err := s.roles.UpdateWithMenus(ctx, *existing, normalizedMenuIDs); err != nil {
		if errors.Is(err, repository.ErrDuplicateKey) {
			return ErrRoleNameTaken
		}
		return fmt.Errorf("update role with menus: %w", err)
	}
	return nil
}

// Delete 删除角色
func (s *RoleService) Delete(ctx context.Context, id int64) error {
	existing, err := s.roles.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get role: %w", err)
	}
	if existing == nil {
		return ErrRoleNotFound
	}
	if existing.Name == systemRoleName {
		return ErrSystemRoleProtected
	}
	return s.roles.Delete(ctx, id)
}

// GetMenuIDs 获取角色已授权的菜单 ID 列表
func (s *RoleService) GetMenuIDs(ctx context.Context, roleID int64) ([]int64, error) {
	existing, err := s.roles.GetByID(ctx, roleID)
	if err != nil {
		return nil, fmt.Errorf("get role: %w", err)
	}
	if existing == nil {
		return nil, ErrRoleNotFound
	}
	ids, err := s.menus.GetMenuIDsByRoleID(ctx, roleID)
	if err != nil {
		return nil, fmt.Errorf("get menu ids: %w", err)
	}
	return ids, nil
}

// SetMenus 批量覆盖角色权限
func (s *RoleService) SetMenus(ctx context.Context, roleID int64, menuIDs []int64) error {
	existing, err := s.roles.GetByID(ctx, roleID)
	if err != nil {
		return fmt.Errorf("get role: %w", err)
	}
	if existing == nil {
		return ErrRoleNotFound
	}
	if existing.Name == systemRoleName {
		return ErrSystemRoleProtected
	}
	normalizedMenuIDs, err := s.normalizeMenuIDs(ctx, menuIDs)
	if err != nil {
		return err
	}
	return s.roles.SetMenus(ctx, roleID, normalizedMenuIDs)
}

func (s *RoleService) normalizeMenuIDs(ctx context.Context, menuIDs []int64) ([]int64, error) {
	menus, err := s.menus.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("list menus: %w", err)
	}

	menuByID := make(map[int64]model.Menu, len(menus))
	for _, menu := range menus {
		menuByID[menu.ID] = menu
	}

	selected := make(map[int64]struct{}, len(menuIDs))
	for _, id := range menuIDs {
		if _, ok := menuByID[id]; !ok {
			return nil, ErrMenuNotFound
		}
		lineage := make(map[int64]struct{})
		for currentID := id; currentID != 0; {
			if _, exists := lineage[currentID]; exists {
				return nil, ErrMenuParentInvalid
			}
			lineage[currentID] = struct{}{}
			current, ok := menuByID[currentID]
			if !ok {
				return nil, ErrMenuParentInvalid
			}
			selected[currentID] = struct{}{}
			currentID = current.ParentID
		}
	}

	result := make([]int64, 0, len(selected))
	for _, menu := range menus {
		if _, ok := selected[menu.ID]; ok {
			result = append(result, menu.ID)
		}
	}
	return result, nil
}
