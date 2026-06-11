package repository

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	// ErrDuplicateKey 表示数据库唯一约束冲突，供 service 层转换为业务错误
	ErrDuplicateKey = errors.New("唯一键冲突")
	// ErrReferencedRoleNotFound 表示事务依赖的角色不存在
	ErrReferencedRoleNotFound = errors.New("关联角色不存在")
	// ErrMenuCycle 表示菜单父级变更会形成循环
	ErrMenuCycle = errors.New("菜单父级变更会形成循环")
	// ErrLastSuperadmin 表示操作会移除最后一个启用的超级管理员
	ErrLastSuperadmin = errors.New("至少保留一个启用的超级管理员")
	// ErrTwoFAChallengeInvalid 表示 2FA challenge 不存在、过期或绑定信息不匹配
	ErrTwoFAChallengeInvalid = errors.New("2FA challenge 无效或已过期")
	// ErrTwoFAReplay 表示当前 TOTP 时间片已经用于高风险操作
	ErrTwoFAReplay = errors.New("2FA 验证码已使用")
)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
