package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"auth-service/internal/model"
)

// OperationLogRepository 封装 operation_logs 表的数据库操作
type OperationLogRepository struct {
	db *sql.DB
}

// NewOperationLogRepository 构造 OperationLogRepository
func NewOperationLogRepository(db *sql.DB) *OperationLogRepository {
	return &OperationLogRepository{db: db}
}

// OperationLogFilter 分页查询过滤条件
type OperationLogFilter struct {
	OpAccount string
	ReqFunc   string
	StartTime string
	EndTime   string
	Page      int
	PageSize  int
}

// Create 写入一条操作日志
func (r *OperationLogRepository) Create(ctx context.Context, log model.OperationLog) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO operation_logs
			(op_account, op_time, ip, req_func, req_url, req_data, resp_data, req_method, elapsed_time, occur_err, err_msg, success)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`,
		log.OpAccount, log.OpTime, log.IP, log.ReqFunc, log.ReqURL,
		log.ReqData, log.RespData, log.ReqMethod, log.ElapsedTime,
		log.OccurErr, log.ErrMsg, log.Success,
	)
	if err != nil {
		return fmt.Errorf("insert operation log: %w", err)
	}
	return nil
}

// ListPage 分页查询操作日志，返回当页数据和总数
func (r *OperationLogRepository) ListPage(ctx context.Context, f OperationLogFilter) ([]model.OperationLog, int64, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = 20
	}

	var (
		conditions []string
		args       []any
		idx        = 1
	)

	if f.OpAccount != "" {
		conditions = append(conditions, fmt.Sprintf("op_account ILIKE $%d", idx))
		args = append(args, "%"+f.OpAccount+"%")
		idx++
	}
	if f.ReqFunc != "" {
		conditions = append(conditions, fmt.Sprintf("req_func ILIKE $%d", idx))
		args = append(args, "%"+f.ReqFunc+"%")
		idx++
	}
	if f.StartTime != "" {
		conditions = append(conditions, fmt.Sprintf("op_time >= $%d", idx))
		args = append(args, f.StartTime)
		idx++
	}
	if f.EndTime != "" {
		conditions = append(conditions, fmt.Sprintf("op_time <= $%d", idx))
		args = append(args, f.EndTime)
		idx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// 查询总数
	var total int64
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	if err := r.db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM operation_logs %s", where), countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count operation logs: %w", err)
	}

	// 分页查询
	offset := (f.Page - 1) * f.PageSize
	query := fmt.Sprintf(`
		SELECT id, op_account, op_time, ip, req_func, req_url, req_data, resp_data,
		       req_method, elapsed_time, occur_err, err_msg, success
		FROM operation_logs %s
		ORDER BY id DESC
		LIMIT $%d OFFSET $%d
	`, where, idx, idx+1)
	args = append(args, f.PageSize, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query operation logs: %w", err)
	}
	defer rows.Close()

	var logs []model.OperationLog
	for rows.Next() {
		var l model.OperationLog
		if err := rows.Scan(
			&l.ID, &l.OpAccount, &l.OpTime, &l.IP, &l.ReqFunc, &l.ReqURL,
			&l.ReqData, &l.RespData, &l.ReqMethod, &l.ElapsedTime,
			&l.OccurErr, &l.ErrMsg, &l.Success,
		); err != nil {
			return nil, 0, fmt.Errorf("scan operation log: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate operation logs: %w", err)
	}

	return logs, total, nil
}
