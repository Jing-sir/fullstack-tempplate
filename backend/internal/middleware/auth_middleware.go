package middleware

import (
	"strings"

	"auth-service/internal/config"
	"auth-service/internal/consts"
	"auth-service/internal/response"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware 返回 JWT 鉴权中间件。
// 从 Authorization 请求头解析 Bearer Token，验证通过后将 uid 和 username 写入 gin.Context，
// 供后续 Handler 通过 c.GetString("uid") 等方式读取。
func AuthMiddleware(jwtManager *config.JWTManager) gin.HandlerFunc {
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

		// 将身份信息写入上下文，后续 Handler 直接读取，无需重复解析 token
		c.Set("uid", claims.UID)
		c.Set("username", claims.Username)
		c.Next()
	}
}
