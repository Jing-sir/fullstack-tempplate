package handler

import (
	"errors"
	"io"

	"auth-service/internal/config"
	"auth-service/internal/consts"
	"auth-service/internal/middleware"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// Handler 聚合所有 HTTP 处理器，持有 service 层依赖和鉴权中间件
type Handler struct {
	users  *service.UserService         // 用户业务服务
	ivs    *service.IVService           // IV 挑战值服务
	perms  *service.PermissionService   // 权限查询服务（/me 接口）
	menus  *service.MenuService         // 菜单管理服务
	roles  *service.RoleService         // 角色管理服务
	opLogs *service.OperationLogService // 操作日志服务
	auth   gin.HandlerFunc              // JWT 鉴权中间件
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
		auth:   middleware.AuthMiddleware(jwt, users),
	}
}

// RegisterRoutes 注册所有路由。
// 公开路由：/api/v1/login、/api/v1/security/iv
// 鉴权路由：除身份与当前权限查询外，业务接口还会继续校验明确的权限 key
func RegisterRoutes(r *gin.Engine, h *Handler, opLogMiddleware gin.HandlerFunc) {
	api := r.Group("/api/v1")
	{
		api.POST("/login", h.Login)
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
			auth.GET("/user/info", h.GetMe)
			auth.POST("/menus/list", h.ListMenus)
			auth.POST("/permissions/list", h.ListPagePermissions)

			// 用户管理
			auth.POST("/users", h.requireAny("accountManage-add"), h.CreateUser)
			auth.POST("/users/list", h.requireAny("accountManage"), h.GetUsers)
			auth.POST("/user/password", h.UpdateCurrentUserPassword)
			auth.POST("/user/password/check", h.CheckCurrentUserPassword)
			auth.POST("/user/password/2fa/check", h.CheckCurrentUserPasswordAndTwoFA)
			auth.POST("/security/2fa/challenges", h.CreateTwoFAChallenge)
			auth.GET("/user/2fa/setup", h.TwoFASetup)
			auth.POST("/user/2fa/replace/setup", h.TwoFAReplaceSetup)
			auth.POST("/user/2fa/verify", h.TwoFAVerify)

			// 菜单管理：全量树供角色权限页读取，写接口仅开放给菜单管理员
			auth.POST("/admin/menus/list", h.requireAny("rolePermissions-add", "rolePermissions-view", "rolePermissions-edit", "rolePermissions-menuManage"), h.ListAllMenus)
			auth.POST("/admin/menus", h.requireAny("rolePermissions-menuManage"), h.CreateMenu)
			auth.PUT("/admin/menus/:id", h.requireAny("rolePermissions-menuManage"), h.UpdateMenu)
			auth.DELETE("/admin/menus/:id", h.requireAny("rolePermissions-menuManage"), h.DeleteMenu)
			auth.POST("/admin/menus/status/:id", h.requireAny("rolePermissions-menuManage"), h.UpdateMenuStatus)
			auth.POST("/admin/menus/move/:id", h.requireAny("rolePermissions-menuManage"), h.MoveMenu)

			// 角色管理
			auth.POST("/roles/list", h.requireAny("rolePermissions", "accountManage"), h.ListRoles)
			auth.POST("/roles", h.requireAny("rolePermissions-add"), h.CreateRole)
			auth.PUT("/roles/:id", h.requireAny("rolePermissions-edit"), h.UpdateRole)
			auth.DELETE("/roles/:id", h.requireAny("rolePermissions-delete"), h.DeleteRole)
			auth.GET("/roles/menus/:id", h.requireAny("rolePermissions-view", "rolePermissions-edit"), h.GetRoleMenus)
			auth.PUT("/roles/menus/:id", h.requireAny("rolePermissions-edit"), h.SetRoleMenus)
			// 前端 sysRoleApi 扩展接口
			auth.GET("/roles/info/:id", h.requireAny("rolePermissions-view", "rolePermissions-edit"), h.GetRoleInfo)
			auth.POST("/roles/add-update", h.AddUpdateRole)

			// 管理员账号管理
			auth.POST("/admin-users/list", h.requireAny("accountManage"), h.ListAdminUsers)
			auth.GET("/admin-users/detail", h.requireAny("accountManage-edit"), h.GetAdminUserDetail)
			auth.GET("/admin-users/detail/:userId", h.requireAny("accountManage-edit"), h.GetAdminUserDetail)
			auth.POST("/admin-users", h.CreateOrUpdateAdminUser)
			auth.POST("/admin-users/reset-password", h.requireAny("accountManage-resetPassword"), h.ResetAdminUserPassword)
			auth.POST("/admin-users/reset-2fa", h.requireAny("accountManage-reset2FA"), h.ResetAdminUser2FA)

			// 操作日志
			auth.POST("/operation-logs/list", h.requireAny("operationLog"), h.ListOperationLogs)
		}
	}
}

func (h *Handler) requireAny(permissionKeys ...string) gin.HandlerFunc {
	return middleware.RequireAnyPermission(h.perms, permissionKeys...)
}

func bindOptionalJSON(c *gin.Context, body any) error {
	err := c.ShouldBindJSON(body)
	if errors.Is(err, io.EOF) {
		return nil
	}
	return err
}

func (h *Handler) ensureAnyPermission(c *gin.Context, permissionKeys ...string) bool {
	ok, err := h.perms.HasAnyPermission(c.Request.Context(), middleware.GetAdminUserID(c), permissionKeys...)
	if err != nil {
		response.Error(c, consts.InternalServerError, "系统内部错误")
		return false
	}
	if !ok {
		response.Error(c, consts.Forbidden, "权限不足")
		return false
	}
	return true
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
	case errors.Is(err, service.ErrTwoFAChallengeInvalid):
		response.Error(c, consts.BadRequest, err.Error())
	case errors.Is(err, service.ErrTwoFARateLimited):
		response.Error(c, consts.TooManyRequests, err.Error())
	case errors.Is(err, service.ErrTwoFAReplay):
		response.Error(c, consts.Conflict, err.Error())
	case errors.Is(err, service.ErrInvalidIV):
		response.Error(c, consts.BadRequest, "IV 无效或已过期")
	case errors.Is(err, service.ErrUserExists):
		response.Error(c, consts.Conflict, "用户已存在")
	case errors.Is(err, service.ErrTwoFAAlreadyBound):
		response.Error(c, consts.Conflict, "2FA 已绑定")
	case errors.Is(err, service.ErrTwoFANotBound):
		response.Error(c, consts.BadRequest, "当前账号未绑定 2FA")
	case errors.Is(err, service.ErrUserNotFound):
		response.Error(c, consts.NotFound, "用户不存在")
	case errors.Is(err, service.ErrRoleNotFound):
		response.Error(c, consts.NotFound, "角色不存在")
	case errors.Is(err, service.ErrRoleNameTaken):
		response.Error(c, consts.Conflict, "角色标识已存在")
	case errors.Is(err, service.ErrSystemRoleProtected),
		errors.Is(err, service.ErrSystemMenuProtected):
		response.Error(c, consts.Forbidden, err.Error())
	case errors.Is(err, service.ErrSystemRoleUnavailable):
		response.Error(c, consts.InternalServerError, err.Error())
	case errors.Is(err, service.ErrMenuNotFound):
		response.Error(c, consts.NotFound, "菜单不存在")
	case errors.Is(err, service.ErrMenuNameTaken):
		response.Error(c, consts.Conflict, "菜单权限 key 已存在")
	case errors.Is(err, service.ErrPermissionDenied):
		response.Error(c, consts.Forbidden, "权限不足")
	case errors.Is(err, service.ErrSuperadminAssignmentDenied),
		errors.Is(err, service.ErrLastSuperadmin):
		response.Error(c, consts.Forbidden, err.Error())
	case errors.Is(err, service.ErrMenuTypeInvalid),
		errors.Is(err, service.ErrMenuNameImmutable),
		errors.Is(err, service.ErrMenuParentInvalid),
		errors.Is(err, service.ErrMenuHiddenNeedPage),
		errors.Is(err, service.ErrMenuButtonNeedParent),
		errors.Is(err, service.ErrMenuHasChildren),
		errors.Is(err, service.ErrMenuChildrenInvalid),
		errors.Is(err, service.ErrMenuStatusInvalid):
		response.Error(c, consts.BadRequest, err.Error())
	default:
		response.Error(c, consts.InternalServerError, "系统内部错误")
	}
}
