package handler

import (
	"errors"

	"auth-service/internal/config"
	"auth-service/internal/consts"
	"auth-service/internal/middleware"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	users *service.UserService
	ivs   *service.IVService
	auth  gin.HandlerFunc
}

func New(users *service.UserService, ivs *service.IVService, jwt *config.JWTManager) *Handler {
	return &Handler{
		users: users,
		ivs:   ivs,
		auth:  middleware.AuthMiddleware(jwt),
	}
}

func RegisterRoutes(r *gin.Engine, h *Handler) {
	api := r.Group("/api/v1")
	{
		api.POST("/login", h.Login)
		api.POST("/users", h.CreateUser)
		api.GET("/security/iv", h.GetIV)

		auth := api.Group("/")
		auth.Use(h.auth)
		{
			auth.GET("/users", h.GetUsers)
			auth.GET("/user/2fa/setup", h.TwoFASetup)
			auth.POST("/user/2fa/verify", h.TwoFAVerify)
		}
	}
}

func (h *Handler) Login(c *gin.Context) {
	var input service.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	result, err := h.users.Login(c.Request.Context(), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *Handler) CreateUser(c *gin.Context) {
	var input service.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	user, err := h.users.CreateUser(c.Request.Context(), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"user": user})
}

func (h *Handler) GetUsers(c *gin.Context) {
	users, err := h.users.ListUsers(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"users": users})
}

func (h *Handler) GetIV(c *gin.Context) {
	challenge, err := h.ivs.Create(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, challenge)
}

func (h *Handler) TwoFASetup(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	result, err := h.users.SetupTwoFA(c.Request.Context(), uid)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

func (h *Handler) TwoFAVerify(c *gin.Context) {
	uid := c.GetString("uid")
	if uid == "" {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return
	}

	var input struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	result, err := h.users.VerifyTwoFA(c.Request.Context(), uid, input.Code)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, result)
}

func writeServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidCredentials):
		response.Error(c, consts.Unauthorized, "用户名或密码错误")
	case errors.Is(err, service.ErrInvalidTwoFACode):
		response.Error(c, consts.BadRequest, "2FA 验证失败")
	case errors.Is(err, service.ErrInvalidIV):
		response.Error(c, consts.BadRequest, "IV 无效或已过期")
	case errors.Is(err, service.ErrUserExists):
		response.Error(c, consts.Conflict, "用户已存在")
	case errors.Is(err, service.ErrTwoFAAlreadyBound):
		response.Error(c, consts.Conflict, "2FA 已绑定")
	case errors.Is(err, service.ErrUserNotFound):
		response.Error(c, consts.NotFound, "用户不存在")
	default:
		response.Error(c, consts.InternalServerError, "系统内部错误")
	}
}
