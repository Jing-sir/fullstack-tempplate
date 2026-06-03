package config

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims 是 JWT Payload 的自定义声明，包含用户标识信息
type JWTClaims struct {
	UID          string `json:"uid"`
	Username     string `json:"username"`
	TokenVersion int    `json:"token_version"`
	Purpose      string `json:"purpose,omitempty"`
	jwt.RegisteredClaims
}

const TokenPurposeTwoFASetup = "2fa_setup"

const twoFASetupTokenExpire = 10 * time.Minute

// JWTManager 负责 JWT 的签发与解析
type JWTManager struct {
	secret []byte        // HMAC-SHA256 签名密钥
	expire time.Duration // token 有效期
}

// NewJWTManager 构造 JWTManager
func NewJWTManager(secret string, expire time.Duration) *JWTManager {
	return &JWTManager{
		secret: []byte(secret),
		expire: expire,
	}
}

// GenerateToken 为指定用户签发 JWT，有效期由配置决定
func (m *JWTManager) GenerateToken(uid, username string, tokenVersion int) (string, error) {
	return m.generateToken(uid, username, tokenVersion, "", m.expire)
}

// GenerateTwoFASetupToken 签发仅用于完成 2FA 绑定的受限 JWT
func (m *JWTManager) GenerateTwoFASetupToken(uid, username string, tokenVersion int) (string, error) {
	expire := min(m.expire, twoFASetupTokenExpire)
	return m.generateToken(uid, username, tokenVersion, TokenPurposeTwoFASetup, expire)
}

func (m *JWTManager) generateToken(uid, username string, tokenVersion int, purpose string, expire time.Duration) (string, error) {
	now := time.Now()
	claims := JWTClaims{
		UID:          uid,
		Username:     username,
		TokenVersion: tokenVersion,
		Purpose:      purpose,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expire)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// ParseToken 解析并验证 JWT，返回声明信息；token 无效或已过期时返回 error
func (m *JWTManager) ParseToken(tokenString string) (*JWTClaims, error) {
	claims := &JWTClaims{}
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	token, err := parser.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return m.secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}
	if !token.Valid {
		return nil, errors.New("token 无效")
	}
	return claims, nil
}
