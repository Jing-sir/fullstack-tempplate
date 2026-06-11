package handler

import (
	"bytes"
	"context"
	"database/sql"
	"net/http/httptest"
	"testing"
	"time"

	"auth-service/internal/model"
	"auth-service/internal/repository"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

type adminUserSecurityStore struct {
	operator        *model.AdminUser
	target          *model.AdminUser
	passwordUpdated bool
	twoFAReset      bool
}

func (s *adminUserSecurityStore) Create(context.Context, model.AdminUser) error {
	return nil
}

func (s *adminUserSecurityStore) CreateWithRole(context.Context, model.AdminUser, int64) error {
	return nil
}

func (s *adminUserSecurityStore) CountByUsername(context.Context, string) (int, error) {
	return 0, nil
}

func (s *adminUserSecurityStore) GetAll(context.Context) ([]model.AdminUser, error) {
	return nil, nil
}

func (s *adminUserSecurityStore) GetByUsername(context.Context, string) (*model.AdminUser, error) {
	return nil, nil
}

func (s *adminUserSecurityStore) GetByUID(_ context.Context, uid string) (*model.AdminUser, error) {
	if s.target != nil && s.target.UID == uid {
		return s.target, nil
	}
	return nil, nil
}

func (s *adminUserSecurityStore) GetByID(_ context.Context, id int64) (*model.AdminUser, error) {
	if s.operator != nil && s.operator.ID == id {
		return s.operator, nil
	}
	return nil, nil
}

func (s *adminUserSecurityStore) UpdateTwoFASecret(context.Context, int64, string) error {
	return nil
}

func (s *adminUserSecurityStore) EnableTwoFA(context.Context, int64) (int, error) {
	return 1, nil
}

func (s *adminUserSecurityStore) Update(context.Context, model.AdminUser) error {
	return nil
}

func (s *adminUserSecurityStore) UpdateWithRole(context.Context, model.AdminUser, *int64) error {
	return nil
}

func (s *adminUserSecurityStore) UpdatePassword(context.Context, int64, string) error {
	s.passwordUpdated = true
	return nil
}

func (s *adminUserSecurityStore) ResetTwoFA(context.Context, int64) error {
	s.twoFAReset = true
	return nil
}

func (s *adminUserSecurityStore) SetRole(context.Context, int64, int64) error {
	return nil
}

func (s *adminUserSecurityStore) ListPage(context.Context, repository.AdminUserFilter) ([]repository.AdminUserRow, int64, error) {
	return nil, 0, nil
}

type missingPasswordIVStore struct{}

func (missingPasswordIVStore) Get(context.Context, string) (string, error) {
	return "", service.ErrInvalidIV
}

func (missingPasswordIVStore) Delete(context.Context, string) error {
	return nil
}

type handlerTwoFASecurityStore struct{}

func (*handlerTwoFASecurityStore) SaveChallenge(
	context.Context,
	string,
	int64,
	string,
	string,
	time.Duration,
) error {
	return nil
}

func (*handlerTwoFASecurityStore) IsBlocked(context.Context, int64, int64) (bool, error) {
	return false, nil
}

func (*handlerTwoFASecurityStore) RecordFailure(context.Context, int64, time.Duration) (int64, error) {
	return 1, nil
}

func (*handlerTwoFASecurityStore) ConsumeChallenge(
	context.Context,
	string,
	int64,
	string,
	string,
	int64,
	time.Duration,
) error {
	return nil
}

func TestAdminUserResetHandlersRejectInvalidCurrentTwoFA(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, testCase := range []struct {
		name string
		body string
		call func(*Handler, *gin.Context)
	}{
		{
			name: "reset password",
			body: `{"userId":"target-uid","password":"cipher","facode":"000000","fa_challenge_id":"challenge-1","iv_id":"iv-1"}`,
			call: func(h *Handler, c *gin.Context) {
				h.ResetAdminUserPassword(c)
			},
		},
		{
			name: "reset 2fa",
			body: `{"userId":"target-uid","facode":"000000","fa_challenge_id":"challenge-1"}`,
			call: func(h *Handler, c *gin.Context) {
				h.ResetAdminUser2FA(c)
			},
		},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			store := &adminUserSecurityStore{
				operator: &model.AdminUser{
					ID:           1,
					UID:          "operator-uid",
					TwoFAEnabled: true,
					TwoFASecret: sql.NullString{
						String: "JBSWY3DPEHPK3PXP",
						Valid:  true,
					},
				},
				target: &model.AdminUser{ID: 2, UID: "target-uid"},
			}
			users := service.NewUserService(
				store,
				nil,
				missingPasswordIVStore{},
				&handlerTwoFASecurityStore{},
				nil,
				"test-key",
				"test-issuer",
			)
			h := &Handler{users: users}
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest("POST", "/", bytes.NewBufferString(testCase.body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Set("admin_user_id", int64(1))
			c.Set("uid", "operator-uid")

			testCase.call(h, c)

			if recorder.Code != 400 {
				t.Fatalf("status = %d, want 400", recorder.Code)
			}
			if store.passwordUpdated {
				t.Fatal("password was updated after invalid 2FA")
			}
			if store.twoFAReset {
				t.Fatal("2FA was reset after invalid 2FA")
			}
		})
	}
}
