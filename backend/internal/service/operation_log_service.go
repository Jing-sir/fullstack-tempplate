package service

import (
	"context"
	"fmt"

	"auth-service/internal/model"
	"auth-service/internal/repository"
)

// OperationLogFilter 分页查询过滤参数
type OperationLogFilter = repository.OperationLogFilter

// OperationLogService 负责操作日志查询业务逻辑
type OperationLogService struct {
	repo *repository.OperationLogRepository
}

// NewOperationLogService 构造 OperationLogService
func NewOperationLogService(repo *repository.OperationLogRepository) *OperationLogService {
	return &OperationLogService{repo: repo}
}

// ListPage 分页查询操作日志
func (s *OperationLogService) ListPage(ctx context.Context, f OperationLogFilter) ([]model.OperationLog, int64, error) {
	logs, total, err := s.repo.ListPage(ctx, f)
	if err != nil {
		return nil, 0, fmt.Errorf("list operation logs: %w", err)
	}
	if logs == nil {
		logs = []model.OperationLog{}
	}
	return logs, total, nil
}
