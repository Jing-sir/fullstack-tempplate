package model

import (
	"database/sql"
	"time"
)

// AdminUser 对应 admin_users 表，代表后台管理系统的操作员账号
type AdminUser struct {
	ID           int64          `json:"id"`
	UID          string         `json:"uid"`
	Username     string         `json:"username"`
	Email        string         `json:"email"`
	Phone        string         `json:"phone"`
	Password     string         `json:"-"`              // bcrypt 哈希，序列化时隐藏
	TwoFAEnabled bool           `json:"two_fa_enabled"`
	TwoFASecret  sql.NullString `json:"-"`              // TOTP 密钥，序列化时隐藏
	Status       int            `json:"status"`         // 1=正常 0=禁用
	Avatar       string         `json:"avatar"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// PublicAdminUser 是对外安全暴露的管理员信息，不含密码哈希和 2FA 密钥
type PublicAdminUser struct {
	ID           int64     `json:"id"`
	UID          string    `json:"uid"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	TwoFAEnabled bool      `json:"two_fa_enabled"`
	Status       int       `json:"status"`
	Avatar       string    `json:"avatar"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Public 将完整管理员信息转换为脱敏的公开视图
func (u AdminUser) Public() PublicAdminUser {
	return PublicAdminUser{
		ID:           u.ID,
		UID:          u.UID,
		Username:     u.Username,
		Email:        u.Email,
		Phone:        u.Phone,
		TwoFAEnabled: u.TwoFAEnabled,
		Status:       u.Status,
		Avatar:       u.Avatar,
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
	}
}
