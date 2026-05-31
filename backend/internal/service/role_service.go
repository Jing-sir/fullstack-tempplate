package service

import (
	"context"
	"errors"
	"fmt"

	"auth-service/internal/model"
)

// 角色管理业务错误
var (
	ErrRoleNotFound = errors.New("角色不存在")
)

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
		return 0, fmt.Errorf("create role: %w", err)
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

	existing.Name = input.Name
	existing.Title = input.Title
	existing.Description = input.Description
	existing.Status = input.Status

	return s.roles.Update(ctx, *existing)
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
	return s.roles.SetMenus(ctx, roleID, menuIDs)
}
