package repository

import (
	"auth-service/internal/model"
	"context"
	"database/sql"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user model.User) error {
	query := `
		INSERT INTO users (uid, username, email, phone, password, two_fa_enabled, status, avatar, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`
	_, err := r.db.ExecContext(
		ctx,
		query,
		user.UID,
		user.Username,
		user.Email,
		user.Phone,
		user.Password,
		user.TwoFAEnabled,
		user.Status,
		user.Avatar,
	)
	return err
}

func (r *UserRepository) CountByUsername(ctx context.Context, username string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE username=?", username).Scan(&count)
	return count, err
}

func (r *UserRepository) GetAll(ctx context.Context) ([]model.User, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, uid, username, email, phone, password, two_fa_enabled, two_fa_secret, status, avatar, created_at, updated_at
		FROM users
		ORDER BY id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := scanUser(rows, &u); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	query := `
		SELECT id, uid, username, email, phone, password, two_fa_enabled, two_fa_secret, status, avatar, created_at, updated_at
		FROM users
		WHERE username = ?
		LIMIT 1
	`
	var u model.User
	if err := scanUser(r.db.QueryRowContext(ctx, query, username), &u); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByUID(ctx context.Context, uid string) (*model.User, error) {
	query := `
		SELECT id, uid, username, email, phone, password, two_fa_enabled, two_fa_secret, status, avatar, created_at, updated_at
		FROM users
		WHERE uid = ?
		LIMIT 1
	`
	var u model.User
	if err := scanUser(r.db.QueryRowContext(ctx, query, uid), &u); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) UpdateTwoFASecret(ctx context.Context, userID int64, secret string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET two_fa_secret=?, two_fa_enabled=0, updated_at=NOW() WHERE id=?", secret, userID)
	return err
}

func (r *UserRepository) EnableTwoFA(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET two_fa_enabled=1, updated_at=NOW() WHERE id=?", userID)
	return err
}

type userScanner interface {
	Scan(dest ...any) error
}

func scanUser(scanner userScanner, u *model.User) error {
	return scanner.Scan(
		&u.ID,
		&u.UID,
		&u.Username,
		&u.Email,
		&u.Phone,
		&u.Password,
		&u.TwoFAEnabled,
		&u.TwoFASecret,
		&u.Status,
		&u.Avatar,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
}
