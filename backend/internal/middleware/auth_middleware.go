package middleware

import (
	"context"
	"strconv"
	"strings"

	"auth-service/internal/config"
	"auth-service/internal/consts"
	"auth-service/internal/model"
	"auth-service/internal/response"

	"github.com/gin-gonic/gin"
)

const (
	adminUserIDContextKey   = "admin_user_id"
	PermissionVersionHeader = "X-Permission-Version"
)

// AdminUserLookup 定义鉴权中间件读取管理员账号的最小依赖
type AdminUserLookup interface {
	GetUserByUID(ctx context.Context, uid string) (*model.AdminUser, error)
}

// PermissionChecker 定义接口权限中间件读取权限的最小依赖
type PermissionChecker interface {
	HasAnyPermission(ctx context.Context, adminUserID int64, permissionKeys ...string) (bool, error)
}

// AuthMiddleware 返回 JWT 鉴权中间件。
// 从 Authorization 请求头解析 Bearer Token，验证通过后将 uid 和 username 写入 gin.Context，
// 供后续 Handler 通过 c.GetString("uid") 等方式读取。
func AuthMiddleware(jwtManager *config.JWTManager, users AdminUserLookup) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, consts.Unauthorized, "缺少 Authorization header")
			c.Abort()
			return
		}

		// 格式必须为 "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Error(c, consts.Unauthorized, "无效的 Authorization 格式")
			c.Abort()
			return
		}

		claims, err := jwtManager.ParseToken(parts[1])
		if err != nil {
			response.Error(c, consts.Unauthorized, "token 无效或已过期")
			c.Abort()
			return
		}

		user, err := users.GetUserByUID(c.Request.Context(), claims.UID)
		if err != nil || user == nil || user.Status != 1 || user.TokenVersion != claims.TokenVersion {
			response.Error(c, consts.Unauthorized, "账号状态已变更，请重新登录")
			c.Abort()
			return
		}
		if (claims.Purpose == config.TokenPurposeTwoFASetup || !user.TwoFAEnabled) && !isTwoFASetupPath(c.Request.URL.Path) {
			response.Error(c, consts.Forbidden, "请先完成 2FA 绑定")
			c.Abort()
			return
		}

		// 使用数据库中的最新身份信息，避免账号修改后继续信任旧 token 内的用户名
		c.Set("uid", user.UID)
		c.Set("username", user.Username)
		c.Set(adminUserIDContextKey, user.ID)
		c.Header(PermissionVersionHeader, strconv.FormatInt(user.PermissionVersion, 10))
		c.Next()
	}
}

func isTwoFASetupPath(path string) bool {
	return path == "/api/v1/user/2fa/setup" || path == "/api/v1/user/2fa/verify"
}

// RequireAnyPermission 要求当前管理员至少拥有一个指定权限 key
func RequireAnyPermission(checker PermissionChecker, permissionKeys ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		adminUserID := c.GetInt64(adminUserIDContextKey)
		if adminUserID == 0 {
			response.Error(c, consts.Unauthorized, "用户未登录")
			c.Abort()
			return
		}

		ok, err := checker.HasAnyPermission(c.Request.Context(), adminUserID, permissionKeys...)
		if err != nil {
			response.Error(c, consts.InternalServerError, "系统内部错误")
			c.Abort()
			return
		}
		if !ok {
			response.Error(c, consts.Forbidden, "权限不足")
			c.Abort()
			return
		}
		c.Next()
	}
}

// GetAdminUserID 返回鉴权中间件写入的管理员内部 ID
func GetAdminUserID(c *gin.Context) int64 {
	return c.GetInt64(adminUserIDContextKey)
}
