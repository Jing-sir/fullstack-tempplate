package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppName           string
	HTTPAddr          string
	AppEnv            string
	CORSOrigins       []string
	DatabaseDSN       string
	RedisAddr         string
	RedisPassword     string
	RedisDB           int
	JWTSecret         string
	JWTExpirePeriod   time.Duration
	PasswordCryptoKey string
	SeedUsername      string
	SeedPassword      string
}

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
		return Config{}, errors.New("DATABASE_DSN is required")
	}

	if cfg.AppEnv == "production" {
		if cfg.JWTSecret == "dev-secret-change-me" {
			return Config{}, errors.New("JWT_SECRET is required in production")
		}
		if cfg.PasswordCryptoKey == "dev-password-crypto-key" {
			return Config{}, errors.New("PASSWORD_CRYPTO_KEY is required in production")
		}
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

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
