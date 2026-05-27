package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type IVRepository struct {
	client *redis.Client
}

func NewIVRepository(client *redis.Client) *IVRepository {
	return &IVRepository{client: client}
}

func (r *IVRepository) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *IVRepository) Save(ctx context.Context, key, iv string, ttl time.Duration) error {
	return r.client.Set(ctx, key, iv, ttl).Err()
}

func (r *IVRepository) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}
