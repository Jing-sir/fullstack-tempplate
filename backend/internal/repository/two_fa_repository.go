package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	twoFAChallengeKeyPrefix = "security:2fa:challenge:"
	twoFAFailureKeyPrefix   = "security:2fa:failures:"
	twoFAReplayKeyPrefix    = "security:2fa:used:"
)

var (
	recordTwoFAFailureScript = redis.NewScript(`
		local count = redis.call("INCR", KEYS[1])
		if count == 1 then
			redis.call("EXPIRE", KEYS[1], ARGV[1])
		end
		return count
	`)
	consumeTwoFAChallengeScript = redis.NewScript(`
		local value = redis.call("GET", KEYS[1])
		if not value or value ~= ARGV[1] then
			return 0
		end
		if redis.call("EXISTS", KEYS[2]) == 1 then
			return -1
		end
		redis.call("SET", KEYS[2], "1", "EX", ARGV[2])
		redis.call("DEL", KEYS[1])
		redis.call("DEL", KEYS[3])
		return 1
	`)
)

// TwoFARepository 保存 2FA challenge、失败窗口和防重放标记
type TwoFARepository struct {
	client *redis.Client
	prefix string
}

// NewTwoFARepository 构造 TwoFARepository
func NewTwoFARepository(client *redis.Client, appEnv string) *TwoFARepository {
	return &TwoFARepository{
		client: client,
		prefix: "auth-service:" + appEnv + ":",
	}
}

// SaveChallenge 保存绑定用户、动作和目标的一次性 challenge
func (r *TwoFARepository) SaveChallenge(
	ctx context.Context,
	id string,
	userID int64,
	action string,
	target string,
	ttl time.Duration,
) error {
	if err := r.client.Set(
		ctx,
		r.prefix+twoFAChallengeKeyPrefix+id,
		twoFAChallengeValue(userID, action, target),
		ttl,
	).Err(); err != nil {
		return fmt.Errorf("save 2fa challenge: %w", err)
	}
	return nil
}

// IsBlocked 判断用户是否达到 2FA 失败上限
func (r *TwoFARepository) IsBlocked(ctx context.Context, userID int64, limit int64) (bool, error) {
	count, err := r.client.Get(ctx, r.failureKey(userID)).Int64()
	if err != nil && err != redis.Nil {
		return false, fmt.Errorf("get 2fa failure count: %w", err)
	}
	return count >= limit, nil
}

// RecordFailure 记录一次 2FA 失败并返回窗口内累计次数
func (r *TwoFARepository) RecordFailure(ctx context.Context, userID int64, ttl time.Duration) (int64, error) {
	count, err := recordTwoFAFailureScript.Run(
		ctx,
		r.client,
		[]string{r.failureKey(userID)},
		int64(ttl/time.Second),
	).Int64()
	if err != nil {
		return 0, fmt.Errorf("record 2fa failure: %w", err)
	}
	return count, nil
}

// ConsumeChallenge 原子消费 challenge 并写入 TOTP 时间片防重放标记
func (r *TwoFARepository) ConsumeChallenge(
	ctx context.Context,
	id string,
	userID int64,
	action string,
	target string,
	counter int64,
	replayTTL time.Duration,
) error {
	result, err := consumeTwoFAChallengeScript.Run(
		ctx,
		r.client,
		[]string{
			r.prefix + twoFAChallengeKeyPrefix + id,
			r.prefix + twoFAReplayKeyPrefix + strconv.FormatInt(userID, 10) + ":" + strconv.FormatInt(counter, 10),
			r.failureKey(userID),
		},
		twoFAChallengeValue(userID, action, target),
		int64(replayTTL/time.Second),
	).Int64()
	if err != nil {
		return fmt.Errorf("consume 2fa challenge: %w", err)
	}
	switch result {
	case 1:
		return nil
	case -1:
		return ErrTwoFAReplay
	default:
		return ErrTwoFAChallengeInvalid
	}
}

func (r *TwoFARepository) failureKey(userID int64) string {
	return r.prefix + twoFAFailureKeyPrefix + strconv.FormatInt(userID, 10)
}

func twoFAChallengeValue(userID int64, action, target string) string {
	sum := sha256.Sum256([]byte(target))
	return strconv.FormatInt(userID, 10) + "|" + action + "|" + hex.EncodeToString(sum[:])
}
