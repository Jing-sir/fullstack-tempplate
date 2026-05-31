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

// Handler 聚合所有 HTTP 处理器，持有 service 层依赖和鉴权中间件
type Handler struct {
	users  *service.UserService          // 用户业务服务
	ivs    *service.IVService            // IV 挑战值服务
	perms  *service.PermissionService    // 权限查询服务（/me 接口）
	menus  *service.MenuService          // 菜单管理服务
	roles  *service.RoleService          // 角色管理服务
	opLogs *service.OperationLogService  // 操作日志服务
	auth   gin.HandlerFunc               // JWT 鉴权中间件
}

// New 构造 Handler，注入依赖
func New(
	users *service.UserService,
	ivs *service.IVService,
	perms *service.PermissionService,
	menus *service.MenuService,
	roles *service.RoleService,
	opLogs *service.OperationLogService,
	jwt *config.JWTManager,
) *Handler {
	return &Handler{
		users:  users,
		ivs:    ivs,
		perms:  perms,
		menus:  menus,
		roles:  roles,
		opLogs: opLogs,
		auth:   middleware.AuthMiddleware(jwt),
	}
}

// RegisterRoutes 注册所有路由。
// 公开路由：/api/v1/login、/api/v1/users（注册）、/api/v1/security/iv
// 鉴权路由：/api/v1/userInfo、/api/v1/menus、/api/v1/roles、/api/v1/admin-users、/api/v1/user/2fa/*
func RegisterRoutes(r *gin.Engine, h *Handler, opLogMiddleware gin.HandlerFunc) {
	api := r.Group("/api/v1")
	{
		api.POST("/login", h.Login)
		api.POST("/users", h.CreateUser)
		api.GET("/security/iv", h.GetIV)

		// 以下路由需要携带有效 JWT
		auth := api.Group("/")
		auth.Use(h.auth)
		if opLogMiddleware != nil {
			auth.Use(opLogMiddleware)
		}
		{
			// 当前用户信息与权限菜单
			auth.GET("/userInfo", h.GetMe)

			// 用户管理
			auth.GET("/users", h.GetUsers)
			auth.GET("/user/2fa/setup", h.TwoFASetup)
			auth.POST("/user/2fa/verify", h.TwoFAVerify)

			// 菜单：GET /menus 返回当前用户权限菜单树（侧栏用）
			// GET /admin/menus 返回全量菜单树（菜单管理页用）
			auth.GET("/menus", h.ListMenus)
			auth.GET("/admin/menus", h.ListAllMenus)
			auth.POST("/admin/menus", h.CreateMenu)
			auth.PUT("/admin/menus/:id", h.UpdateMenu)
			auth.DELETE("/admin/menus/:id", h.DeleteMenu)

			// 角色管理
			auth.GET("/roles", h.ListRoles)
			auth.POST("/roles", h.CreateRole)
			auth.PUT("/roles/:id", h.UpdateRole)
			auth.DELETE("/roles/:id", h.DeleteRole)
			auth.GET("/roles/:id/menus", h.GetRoleMenus)
			auth.PUT("/roles/:id/menus", h.SetRoleMenus)
			// 前端 sysRoleApi 扩展接口
			auth.GET("/roles/:id/info", h.GetRoleInfo)
			auth.POST("/roles/add-update", h.AddUpdateRole)

			// 管理员账号管理
			auth.GET("/admin-users", h.ListAdminUsers)
			auth.GET("/admin-users/detail", h.GetAdminUserDetail)
			auth.POST("/admin-users", h.CreateOrUpdateAdminUser)
			auth.POST("/admin-users/reset-password", h.ResetAdminUserPassword)
			auth.POST("/admin-users/reset-2fa", h.ResetAdminUser2FA)

			// 操作日志
			auth.GET("/operation-logs", h.ListOperationLogs)
		}
	}
}

// Login 处理用户登录，支持密码加密传输和 2FA 验证
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

// CreateUser 注册新用户
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

// GetUsers 返回所有用户列表（需鉴权）
func (h *Handler) GetUsers(c *gin.Context) {
	users, err := h.users.ListUsers(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"users": users})
}

// GetIV 生成并返回 AES-GCM IV 挑战值，前端用于加密密码后提交
func (h *Handler) GetIV(c *gin.Context) {
	challenge, err := h.ivs.Create(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, challenge)
}

// TwoFASetup 初始化 2FA 绑定流程，返回 TOTP 二维码链接（需鉴权）
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

// TwoFAVerify 验证用户输入的 TOTP 验证码，成功后完成 2FA 绑定并签发 JWT（需鉴权）
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

// writeServiceError 将 service 层业务错误转换为对应的 HTTP 状态码和错误消息
func writeServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidCredentials):
		response.Error(c, consts.BadRequest, "用户名或密码错误")
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
	case errors.Is(err, service.ErrRoleNotFound):
		response.Error(c, consts.NotFound, "角色不存在")
	case errors.Is(err, service.ErrMenuNotFound):
		response.Error(c, consts.NotFound, "菜单不存在")
	default:
		response.Error(c, consts.InternalServerError, "系统内部错误")
	}
}
