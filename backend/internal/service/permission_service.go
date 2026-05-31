package service

import (
	"context"
	"fmt"

	"auth-service/internal/model"
)

// MeResult 是 GET /api/v1/userInfo 的响应结构，只含用户基本信息
type MeResult struct {
	UID      string `json:"uid"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Status   int    `json:"status"`
}

// PermissionService 负责权限查询业务逻辑
type PermissionService struct {
	roles RoleStore
	menus MenuStore
}

// NewPermissionService 构造 PermissionService
func NewPermissionService(roles RoleStore, menus MenuStore) *PermissionService {
	return &PermissionService{
		roles: roles,
		menus: menus,
	}
}

// GetMe 返回当前登录管理员的基本信息
func (s *PermissionService) GetMe(ctx context.Context, user *model.AdminUser) (MeResult, error) {
	return MeResult{
		UID:      user.UID,
		Username: user.Username,
		Email:    user.Email,
		Status:   user.Status,
	}, nil
}

// GetMyMenus 返回当前用户有权限访问的菜单树
func (s *PermissionService) GetMyMenus(ctx context.Context, user *model.AdminUser) ([]*model.MenuTree, error) {
	roles, err := s.roles.GetByAdminUserID(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get roles: %w", err)
	}

	roleIDs := make([]int64, 0, len(roles))
	for _, r := range roles {
		roleIDs = append(roleIDs, r.ID)
	}

	menus, err := s.menus.GetByRoleIDs(ctx, roleIDs)
	if err != nil {
		return nil, fmt.Errorf("get menus: %w", err)
	}

	return model.BuildMenuTree(menus), nil
}
