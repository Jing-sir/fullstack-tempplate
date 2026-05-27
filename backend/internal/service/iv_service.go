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

type IVChallenge struct {
	ID string `json:"iv_id"`
	IV string `json:"iv"`
}

type IVService struct {
	repo *repository.IVRepository
}

func NewIVService(repo *repository.IVRepository) *IVService {
	return &IVService{repo: repo}
}

func generateIV() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *IVService) Create(ctx context.Context) (IVChallenge, error) {
	iv, err := generateIV()
	if err != nil {
		return IVChallenge{}, err
	}

	id := uuid.NewString()
	ttl := time.Duration(consts.IVExpireDuration) * time.Second
	if err := s.repo.Save(ctx, ivCacheKey(id), iv, ttl); err != nil {
		return IVChallenge{}, err
	}

	// Keep the legacy key during migration so older clients that only send the
	// encrypted password can still log in until they add iv_id.
	_ = s.repo.Save(ctx, consts.IVCacheKey, iv, ttl)

	return IVChallenge{ID: id, IV: iv}, nil
}

func (s *IVService) Get(ctx context.Context, id string) (string, error) {
	if id == "" {
		return s.repo.Get(ctx, consts.IVCacheKey)
	}
	return s.repo.Get(ctx, ivCacheKey(id))
}

func (s *IVService) Delete(ctx context.Context, id string) error {
	if id == "" {
		return nil
	}
	return s.repo.Delete(ctx, ivCacheKey(id))
}

func (s *IVService) GetOrRefreshLegacy(ctx context.Context) (string, error) {
	iv, err := s.repo.Get(ctx, consts.IVCacheKey)
	if err == nil && iv != "" {
		_ = s.repo.Save(ctx, consts.IVCacheKey, iv, time.Duration(consts.IVExpireDuration)*time.Second)
		return iv, nil
	}

	iv, err = generateIV()
	if err != nil {
		return "", err
	}
	err = s.repo.Save(ctx, consts.IVCacheKey, iv, time.Duration(consts.IVExpireDuration)*time.Second)
	return iv, err
}

func ivCacheKey(id string) string {
	return fmt.Sprintf("%s%s", consts.IVCacheKeyPrefix, id)
}
