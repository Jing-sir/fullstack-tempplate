package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"auth-service/internal/config"
	"auth-service/internal/model"

	"github.com/gin-gonic/gin"
)

type stubAdminUserLookup struct {
	user *model.AdminUser
	err  error
}

func (s stubAdminUserLookup) GetUserByUID(context.Context, string) (*model.AdminUser, error) {
	return s.user, s.err
}

type stubPermissionChecker struct {
	allowed bool
}

func (s stubPermissionChecker) HasAnyPermission(context.Context, int64, ...string) (bool, error) {
	return s.allowed, nil
}

func TestAuthMiddlewareRejectsRevokedToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := config.NewJWTManager("test-secret", time.Hour)
	token, err := jwtManager.GenerateToken("uid-1", "alice", 1)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	router := gin.New()
	router.Use(AuthMiddleware(jwtManager, stubAdminUserLookup{
		user: &model.AdminUser{ID: 10, UID: "uid-1", Username: "alice", Status: 1, TokenVersion: 2},
	}))
	router.GET("/protected", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}

func TestAuthMiddlewarePublishesPermissionVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := config.NewJWTManager("test-secret", time.Hour)
	token, err := jwtManager.GenerateToken("uid-1", "alice", 1)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	router := gin.New()
	router.Use(AuthMiddleware(jwtManager, stubAdminUserLookup{
		user: &model.AdminUser{
			ID:                10,
			UID:               "uid-1",
			Username:          "alice",
			Status:            1,
			TokenVersion:      1,
			PermissionVersion: 7,
			TwoFAEnabled:      true,
		},
	}))
	router.GET("/protected", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if got, want := response.Header().Get(PermissionVersionHeader), "7"; got != want {
		t.Fatalf("%s = %q, want %q", PermissionVersionHeader, got, want)
	}
}

func TestRequireAnyPermissionRejectsUnauthorizedUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set(adminUserIDContextKey, int64(10))
	})
	router.Use(RequireAnyPermission(stubPermissionChecker{allowed: false}, "accountManage-edit"))
	router.GET("/protected", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
}

func TestAuthMiddlewareRestrictsTwoFASetupTokenToSetupRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := config.NewJWTManager("test-secret", time.Hour)
	token, err := jwtManager.GenerateTwoFASetupToken("uid-1", "alice", 1)
	if err != nil {
		t.Fatalf("GenerateTwoFASetupToken() error = %v", err)
	}

	router := gin.New()
	router.Use(AuthMiddleware(jwtManager, stubAdminUserLookup{
		user: &model.AdminUser{ID: 10, UID: "uid-1", Username: "alice", Status: 1, TokenVersion: 1},
	}))
	router.GET("/api/v1/userInfo", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	router.GET("/api/v1/user/2fa/setup", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	for path, wantStatus := range map[string]int{
		"/api/v1/userInfo":       http.StatusForbidden,
		"/api/v1/user/2fa/setup": http.StatusOK,
	} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != wantStatus {
			t.Fatalf("GET %s status = %d, want %d", path, response.Code, wantStatus)
		}
	}
}

func TestAuthMiddlewareRestrictsLegacyRegularTokenForUnboundUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := config.NewJWTManager("test-secret", time.Hour)
	token, err := jwtManager.GenerateToken("uid-1", "alice", 1)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	router := gin.New()
	router.Use(AuthMiddleware(jwtManager, stubAdminUserLookup{
		user: &model.AdminUser{ID: 10, UID: "uid-1", Username: "alice", Status: 1, TokenVersion: 1},
	}))
	router.GET("/api/v1/userInfo", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/userInfo", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
}
