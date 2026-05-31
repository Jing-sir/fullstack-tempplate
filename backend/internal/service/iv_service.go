package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"auth-service/internal/consts"
	"auth-service/internal/repository"

	"github.com/google/uuid"
)

// IVChallenge 代表一次 IV 挑战，前端用 IV 对密码做 AES-GCM 加密后连同 ID 一起提交
type IVChallenge struct {
	ID string `json:"iv_id"`
	IV string `json:"iv"`
}

// IVService 管理 AES-GCM 初始向量（IV）的生成、存储和读取，
// 确保每次密码传输使用唯一的随机 nonce，防止重放攻击
type IVService struct {
	repo *repository.IVRepository
}

// NewIVService 构造 IVService
func NewIVService(repo *repository.IVRepository) *IVService {
	return &IVService{repo: repo}
}

// generateIV 生成 12 字节的随机 nonce（AES-GCM 标准 nonce 长度），以十六进制字符串返回
func generateIV() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// Create 生成新的 IV 并写入 Redis，返回挑战对象供前端使用。
// 同时写入遗留全局 key，兼容尚未升级 iv_id 的旧客户端。
func (s *IVService) Create(ctx context.Context) (IVChallenge, error) {
	iv, err := generateIV()
	if err != nil {
		return IVChallenge{}, err
	}

	id := uuid.NewString()
	ttl := time.Duration(consts.IVExpireDuration) * time.Second
	if err := s.repo.Save(ctx, ivCacheKey(id), iv, ttl); err != nil {
		return IVChallenge{}, fmt.Errorf("save iv: %w", err)
	}

	// 向下兼容：旧客户端只发送加密密码，不发送 iv_id，
	// 服务端通过全局 key 读取 IV 进行解密，待所有客户端升级后可移除
	_ = s.repo.Save(ctx, consts.IVCacheKey, iv, ttl)

	return IVChallenge{ID: id, IV: iv}, nil
}

// Get 读取 IV。id 非空时按具体 key 读取，id 为空时读取遗留全局 key（兼容旧客户端）
func (s *IVService) Get(ctx context.Context, id string) (string, error) {
	if id == "" {
		return s.repo.Get(ctx, consts.IVCacheKey)
	}
	return s.repo.Get(ctx, ivCacheKey(id))
}

// Delete 删除指定 ID 的 IV 缓存。IV 为一次性使用，登录后即删除，防止重放攻击。
// id 为空时为空操作。
func (s *IVService) Delete(ctx context.Context, id string) error {
	if id == "" {
		return nil
	}
	return s.repo.Delete(ctx, ivCacheKey(id))
}

// GetOrRefreshLegacy 读取遗留全局 IV，若不存在则生成并写入。
// 仅用于兼容不传 iv_id 的旧客户端，新代码不应调用此方法。
func (s *IVService) GetOrRefreshLegacy(ctx context.Context) (string, error) {
	iv, err := s.repo.Get(ctx, consts.IVCacheKey)
	if err == nil && iv != "" {
		// 刷新 TTL，避免高频访问场景下 IV 意外过期
		_ = s.repo.Save(ctx, consts.IVCacheKey, iv, time.Duration(consts.IVExpireDuration)*time.Second)
		return iv, nil
	}

	// IV 不存在，重新生成
	iv, err = generateIV()
	if err != nil {
		return "", err
	}
	err = s.repo.Save(ctx, consts.IVCacheKey, iv, time.Duration(consts.IVExpireDuration)*time.Second)
	return iv, err
}

// ivCacheKey 根据 IV ID 生成 Redis 缓存 key
func ivCacheKey(id string) string {
	return fmt.Sprintf("%s%s", consts.IVCacheKeyPrefix, id)
}
