package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// IVRepository 封装 IV（初始向量）在 Redis 中的读写操作
type IVRepository struct {
	client *redis.Client
}

// NewIVRepository 构造 IVRepository
func NewIVRepository(client *redis.Client) *IVRepository {
	return &IVRepository{client: client}
}

// Get 按 key 从 Redis 读取 IV 值
func (r *IVRepository) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

// Save 将 IV 写入 Redis 并设置过期时间
func (r *IVRepository) Save(ctx context.Context, key, iv string, ttl time.Duration) error {
	if err := r.client.Set(ctx, key, iv, ttl).Err(); err != nil {
		return fmt.Errorf("save iv key=%s: %w", key, err)
	}
	return nil
}

// Delete 从 Redis 删除指定 key 的 IV，登录成功后调用以防止重放攻击
func (r *IVRepository) Delete(ctx context.Context, key string) error {
	if err := r.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("delete iv key=%s: %w", key, err)
	}
	return nil
}
