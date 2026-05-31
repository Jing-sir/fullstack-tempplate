package handler

import (
	"auth-service/internal/consts"
	"auth-service/internal/response"

	"github.com/gin-gonic/gin"
)

// GetMe 返回当前登录管理员的基本信息和角色列表（需鉴权）
func (h *Handler) GetMe(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	user, err := h.users.GetUserByUID(c.Request.Context(), uid)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	result, err := h.perms.GetMe(c.Request.Context(), user)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}
