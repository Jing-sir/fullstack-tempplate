package service

import (
	"context"
	"errors"
	"fmt"

	"auth-service/internal/model"
)

// ErrPermissionDenied 表示当前账号没有请求所需的权限
var ErrPermissionDenied = errors.New("权限不足")

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

// GetMyMenus 返回当前用户有权限访问的导航树，只包含目录和菜单页
func (s *PermissionService) GetMyMenus(ctx context.Context, user *model.AdminUser) ([]*model.MenuTree, error) {
	menus, err := s.getMenusByAdminUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	navigationMenus := make([]model.Menu, 0, len(menus))
	for _, menu := range menus {
		if menu.Type == model.MenuTypeDir || menu.Type == model.MenuTypePage {
			navigationMenus = append(navigationMenus, menu)
		}
	}

	return model.BuildMenuTree(navigationMenus), nil
}

// GetMyPagePermissions 返回当前用户在指定菜单页下拥有的完整子权限树
func (s *PermissionService) GetMyPagePermissions(ctx context.Context, adminUserID int64, pageKey string) ([]*model.MenuTree, error) {
	menus, err := s.getMenusByAdminUserID(ctx, adminUserID)
	if err != nil {
		return nil, err
	}

	var rootID int64
	for _, menu := range menus {
		if menu.Name == pageKey && menu.Type == model.MenuTypePage {
			rootID = menu.ID
			break
		}
	}
	if rootID == 0 {
		return nil, ErrPermissionDenied
	}

	descendants := make([]model.Menu, 0)
	parentIDs := map[int64]struct{}{rootID: {}}
	includedIDs := map[int64]struct{}{rootID: {}}
	for {
		nextParentIDs := make(map[int64]struct{})
		for _, menu := range menus {
			if _, ok := parentIDs[menu.ParentID]; !ok {
				continue
			}
			if _, ok := includedIDs[menu.ID]; ok {
				continue
			}
			if menu.ParentID == rootID {
				menu.ParentID = 0
			}
			descendants = append(descendants, menu)
			includedIDs[menu.ID] = struct{}{}
			nextParentIDs[menu.ID] = struct{}{}
		}
		if len(nextParentIDs) == 0 {
			break
		}
		parentIDs = nextParentIDs
	}

	return model.BuildMenuTree(descendants), nil
}

// HasAnyPermission 判断管理员是否拥有任意一个指定权限 key
func (s *PermissionService) HasAnyPermission(ctx context.Context, adminUserID int64, permissionKeys ...string) (bool, error) {
	if len(permissionKeys) == 0 {
		return false, nil
	}

	menus, err := s.getMenusByAdminUserID(ctx, adminUserID)
	if err != nil {
		return false, err
	}

	required := make(map[string]struct{}, len(permissionKeys))
	for _, key := range permissionKeys {
		required[key] = struct{}{}
	}
	for _, menu := range menus {
		if _, ok := required[menu.Name]; ok {
			return true, nil
		}
	}
	return false, nil
}

func (s *PermissionService) getMenusByAdminUserID(ctx context.Context, adminUserID int64) ([]model.Menu, error) {
	roles, err := s.roles.GetByAdminUserID(ctx, adminUserID)
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

	return menus, nil
}
