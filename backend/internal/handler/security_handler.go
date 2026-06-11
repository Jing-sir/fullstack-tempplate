package handler

import (
	"auth-service/internal/consts"
	"auth-service/internal/middleware"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// CreateTwoFAChallenge 为高风险操作创建一次性 2FA challenge
func (h *Handler) CreateTwoFAChallenge(c *gin.Context) {
	var input struct {
		Action string `json:"action" binding:"required"`
		Target string `json:"target" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	result, err := h.users.CreateTwoFAChallenge(
		c.Request.Context(),
		middleware.GetAdminUserID(c),
		input.Action,
		input.Target,
	)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, result)
}

// CheckCurrentUserPassword 校验当前登录用户的登录密码
func (h *Handler) CheckCurrentUserPassword(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	var input service.PasswordCheckInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	if err := h.users.CheckCurrentUserPassword(c.Request.Context(), uid, input); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// CheckCurrentUserPasswordAndTwoFA 校验当前登录用户的登录密码和当前 2FA
func (h *Handler) CheckCurrentUserPasswordAndTwoFA(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	var input service.PasswordCheckInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	if err := h.users.CheckCurrentUserPasswordAndTwoFA(c.Request.Context(), uid, input); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// UpdateCurrentUserPassword 修改当前登录用户的登录密码
func (h *Handler) UpdateCurrentUserPassword(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	var input service.UpdateCurrentPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	if err := h.users.UpdateCurrentUserPassword(c.Request.Context(), uid, input); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// TwoFAReplaceSetup 校验旧 2FA 后初始化替换绑定流程
func (h *Handler) TwoFAReplaceSetup(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	var input service.PasswordCheckInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	result, err := h.users.SetupReplacementTwoFA(c.Request.Context(), uid, input)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}
