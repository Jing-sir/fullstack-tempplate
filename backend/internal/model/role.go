package model

import "time"

// Role 对应 roles 表
type Role struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`        // 角色标识，英文，如 super_admin / operator
	Title       string    `json:"title"`       // 显示名称，中文
	Description string    `json:"description"`
	Status      int       `json:"status"` // 1=启用 0=禁用
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RoleWithMenus 角色 + 已授权的菜单 ID 列表，用于权限分配接口响应
type RoleWithMenus struct {
	Role
	MenuIDs []int64 `json:"menu_ids"`
}
