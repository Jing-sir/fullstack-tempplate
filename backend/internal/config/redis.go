package config

import (
	"time"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient 根据配置创建 Redis 客户端
func NewRedisClient(cfg Config) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
		Protocol: 3, // 使用 RESP3 协议

		// 超时配置：防止 Redis 慢响应拖垮服务
		DialTimeout:           5 * time.Second,
		ReadTimeout:           3 * time.Second,
		WriteTimeout:          3 * time.Second,
		ContextTimeoutEnabled: true, // 支持通过 context 取消 Redis 操作
	})
}
