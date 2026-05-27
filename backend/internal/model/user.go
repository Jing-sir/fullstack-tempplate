package model

import (
	"database/sql"
	"time"
)

type User struct {
	ID           int64          `json:"id"`  // 数据库自增 ID
	UID          string         `json:"uid"` // 全局唯一标识（UUID）
	Username     string         `json:"username"`
	Email        string         `json:"email"`
	Phone        string         `json:"phone"`
	Password     string         `json:"-"`              // bcrypt hash
	TwoFAEnabled bool           `json:"two_fa_enabled"` // 是否启用 2FA
	TwoFASecret  sql.NullString `json:"two_fa_secret"`  // TOTP 秘钥
	Status       int            `json:"status"`         // 用户状态（1=正常，0=禁用等）
	Avatar       string         `json:"avatar"`         // 用户头像 URL
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

type PublicUser struct {
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

func (u User) Public() PublicUser {
	return PublicUser{
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
