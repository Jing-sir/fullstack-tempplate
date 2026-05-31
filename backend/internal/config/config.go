package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config 保存应用所有运行时配置项
type Config struct {
	AppName           string        // 应用名称，用于 2FA TOTP 发行方显示
	HTTPAddr          string        // HTTP 监听地址，如 ":8800"
	AppEnv            string        // 运行环境：development / production
	CORSOrigins       []string      // 允许的跨域来源列表
	DatabaseDSN       string        // PostgreSQL 连接字符串
	RedisAddr         string        // Redis 地址，如 "127.0.0.1:6379"
	RedisPassword     string        // Redis 密码（可为空）
	RedisDB           int           // Redis 数据库编号
	JWTSecret         string        // JWT HMAC 签名密钥
	JWTExpirePeriod   time.Duration // JWT 有效期
	PasswordCryptoKey string        // AES-GCM 密码解密密钥
	SeedUsername      string        // 种子用户名（开发/测试环境）
	SeedPassword      string        // 种子用户密码（开发/测试环境）
}

// Load 从环境变量加载配置，加载后立即做合法性校验。
// 缺少必要配置时返回 error，调用方应直接 fatal 退出。
func Load() (Config, error) {
	appEnv := getEnv("APP_ENV", "development")
	cfg := Config{
		AppName:           getEnv("APP_NAME", "Auth Service"),
		HTTPAddr:          getEnv("HTTP_ADDR", ":8800"),
		AppEnv:            appEnv,
		CORSOrigins:       splitEnv("CORS_ORIGINS", []string{"http://localhost:60001"}),
		DatabaseDSN:       getEnv("DATABASE_DSN", ""),
		RedisAddr:         getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword:     os.Getenv("REDIS_PASSWORD"),
		RedisDB:           getIntEnv("REDIS_DB", 0),
		JWTSecret:         getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTExpirePeriod:   getDurationEnv("JWT_EXPIRE", 24*time.Hour),
		PasswordCryptoKey: getEnv("PASSWORD_CRYPTO_KEY", "dev-password-crypto-key"),
		SeedUsername:      getEnv("SEED_USERNAME", ""),
		SeedPassword:      getEnv("SEED_PASSWORD", ""),
	}

	if cfg.DatabaseDSN == "" {
		return Config{}, errors.New("DATABASE_DSN 不能为空")
	}

	// 生产环境禁止使用开发默认密钥
	if cfg.AppEnv == "production" {
		if cfg.JWTSecret == "dev-secret-change-me" {
			return Config{}, errors.New("生产环境必须设置 JWT_SECRET")
		}
		if cfg.PasswordCryptoKey == "dev-password-crypto-key" {
			return Config{}, errors.New("生产环境必须设置 PASSWORD_CRYPTO_KEY")
		}
	}

	return cfg, nil
}

// getEnv 读取环境变量，若为空则返回 fallback 默认值
func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

// splitEnv 读取逗号分隔的环境变量，若为空则返回 fallback 列表
func splitEnv(key string, fallback []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parts := strings.Split(value, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			values = append(values, trimmed)
		}
	}
	if len(values) == 0 {
		return fallback
	}
	return values
}

// getIntEnv 读取整数类型的环境变量，解析失败时返回 fallback
func getIntEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	n, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return n
}

// getDurationEnv 读取 time.Duration 类型的环境变量（如 "24h"、"30m"），
// 解析失败时返回 fallback
func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return duration
}
