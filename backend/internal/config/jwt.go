package config

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UID      string `json:"uid"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secret []byte
	expire time.Duration
}

func NewJWTManager(secret string, expire time.Duration) *JWTManager {
	return &JWTManager{
		secret: []byte(secret),
		expire: expire,
	}
}

func (m *JWTManager) GenerateToken(uid, username string) (string, error) {
	now := time.Now()
	claims := JWTClaims{
		UID:      uid,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(m.expire)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *JWTManager) ParseToken(tokenString string) (*JWTClaims, error) {
	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
