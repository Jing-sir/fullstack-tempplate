package middleware

import (
	"auth-service/internal/config"
	"auth-service/internal/consts"
	"auth-service/internal/response"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtManager *config.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, consts.Unauthorized, "缺少 Authorization header")
			c.Abort()
			return
		}

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

		c.Set("uid", claims.UID)
		c.Set("username", claims.Username)
		c.Next()
	}
}
