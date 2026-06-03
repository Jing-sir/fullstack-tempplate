package service

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"auth-service/internal/config"
	"auth-service/internal/model"
	"auth-service/internal/repository"

	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type stubUserStore struct {
	user       *model.AdminUser
	listRows   []repository.AdminUserRow
	listFilter repository.AdminUserFilter
	updated    model.AdminUser
}

func (s *stubUserStore) Create(context.Context, model.AdminUser) error {
	return nil
}

func (s *stubUserStore) CountByUsername(context.Context, string) (int, error) {
	return 0, nil
}

func (s *stubUserStore) GetAll(context.Context) ([]model.AdminUser, error) {
	return nil, nil
}

func (s *stubUserStore) GetByUsername(context.Context, string) (*model.AdminUser, error) {
	return s.user, nil
}

func (s *stubUserStore) GetByUID(context.Context, string) (*model.AdminUser, error) {
	return s.user, nil
}

func (s *stubUserStore) GetByID(context.Context, int64) (*model.AdminUser, error) {
	return s.user, nil
}

func (s *stubUserStore) UpdateTwoFASecret(context.Context, int64, string) error {
	return nil
}

func (s *stubUserStore) EnableTwoFA(context.Context, int64) (int, error) {
	s.user.TwoFAEnabled = true
	s.user.TokenVersion++
	return s.user.TokenVersion, nil
}

func (s *stubUserStore) Update(_ context.Context, user model.AdminUser) error {
	s.updated = user
	return nil
}

func (s *stubUserStore) UpdatePassword(context.Context, int64, string) error {
	return nil
}

func (s *stubUserStore) ResetTwoFA(context.Context, int64) error {
	return nil
}

func (s *stubUserStore) SetRole(context.Context, int64, int64) error {
	return nil
}

func (s *stubUserStore) ListPage(_ context.Context, filter repository.AdminUserFilter) ([]repository.AdminUserRow, int64, error) {
	s.listFilter = filter
	return s.listRows, int64(len(s.listRows)), nil
}

type stubPasswordIVStore struct{}

func (stubPasswordIVStore) Get(context.Context, string) (string, error) {
	return "", errors.New("iv not found")
}

func (stubPasswordIVStore) Delete(context.Context, string) error {
	return nil
}

func newLoginTestService(t *testing.T, user *model.AdminUser) (*UserService, *config.JWTManager) {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("GenerateFromPassword() error = %v", err)
	}
	user.Password = string(hash)
	jwtManager := config.NewJWTManager("test-secret", time.Hour)
	return NewUserService(&stubUserStore{user: user}, stubPasswordIVStore{}, jwtManager, "test-key", "test-issuer"), jwtManager
}

func TestLoginRequiresTwoFASetupForUnboundUser(t *testing.T) {
	service, jwtManager := newLoginTestService(t, &model.AdminUser{
		UID:          "uid-1",
		Username:     "alice",
		Status:       1,
		TokenVersion: 1,
	})

	result, err := service.Login(context.Background(), LoginInput{Username: "alice", Password: "secret"})
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	if !result.TwoFASetupRequired {
		t.Fatal("result.TwoFASetupRequired = false, want true")
	}
	claims, err := jwtManager.ParseToken(result.Token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}
	if claims.Purpose != config.TokenPurposeTwoFASetup {
		t.Fatalf("claims.Purpose = %q, want %q", claims.Purpose, config.TokenPurposeTwoFASetup)
	}
}

func TestLoginRequiresTwoFACodeForBoundUser(t *testing.T) {
	service, _ := newLoginTestService(t, &model.AdminUser{
		UID:          "uid-1",
		Username:     "alice",
		Status:       1,
		TokenVersion: 1,
		TwoFAEnabled: true,
		TwoFASecret:  sql.NullString{String: "JBSWY3DPEHPK3PXP", Valid: true},
	})

	result, err := service.Login(context.Background(), LoginInput{Username: "alice", Password: "secret"})
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	if !result.TwoFARequired {
		t.Fatal("result.TwoFARequired = false, want true")
	}
	if result.Token != "" {
		t.Fatalf("result.Token = %q, want empty", result.Token)
	}
}

func TestVerifyTwoFAInvalidatesSetupTokenAndReturnsRegularToken(t *testing.T) {
	user := &model.AdminUser{
		ID:           1,
		UID:          "uid-1",
		Username:     "alice",
		Status:       1,
		TokenVersion: 1,
		TwoFASecret:  sql.NullString{String: "JBSWY3DPEHPK3PXP", Valid: true},
	}
	service, jwtManager := newLoginTestService(t, user)
	code, err := totp.GenerateCode(user.TwoFASecret.String, time.Now())
	if err != nil {
		t.Fatalf("GenerateCode() error = %v", err)
	}

	result, err := service.VerifyTwoFA(context.Background(), user.UID, code)
	if err != nil {
		t.Fatalf("VerifyTwoFA() error = %v", err)
	}
	claims, err := jwtManager.ParseToken(result.Token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}
	if claims.TokenVersion != 2 {
		t.Fatalf("claims.TokenVersion = %d, want 2", claims.TokenVersion)
	}
	if claims.Purpose != "" {
		t.Fatalf("claims.Purpose = %q, want empty", claims.Purpose)
	}
}

func TestGetAdminUserDetailReturnsStoredRealName(t *testing.T) {
	users := &stubUserStore{
		listRows: []repository.AdminUserRow{{
			AdminUser: model.AdminUser{
				UID:      "uid-1",
				Username: "alice",
				RealName: "Alice Chen",
				Status:   1,
			},
			RoleID:   "2",
			RoleName: "运营",
		}},
	}
	service := &UserService{users: users}

	detail, err := service.GetAdminUserDetail(context.Background(), "uid-1")
	if err != nil {
		t.Fatalf("GetAdminUserDetail() error = %v", err)
	}
	if users.listFilter.UID != "uid-1" {
		t.Fatalf("ListPage() UID = %q, want %q", users.listFilter.UID, "uid-1")
	}
	if detail.FullName != "Alice Chen" {
		t.Fatalf("detail.FullName = %q, want %q", detail.FullName, "Alice Chen")
	}
}

func TestUpdateAdminUserUpdatesRealName(t *testing.T) {
	users := &stubUserStore{
		user: &model.AdminUser{
			ID:       1,
			UID:      "uid-1",
			Username: "alice",
			RealName: "Alice",
			Status:   1,
		},
	}
	service := &UserService{users: users}

	err := service.UpdateAdminUser(context.Background(), AdminUserUpdateInput{
		ID:       "uid-1",
		FullName: "Alice Chen",
	})
	if err != nil {
		t.Fatalf("UpdateAdminUser() error = %v", err)
	}
	if users.updated.RealName != "Alice Chen" {
		t.Fatalf("updated.RealName = %q, want %q", users.updated.RealName, "Alice Chen")
	}
}
