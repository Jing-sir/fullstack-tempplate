package handler

import (
	"auth-service/internal/consts"
	"auth-service/internal/middleware"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// ListAdminUsers 分页查询管理员账号列表
func (h *Handler) ListAdminUsers(c *gin.Context) {
	var body struct {
		Account  string `json:"account"`
		RealName string `json:"realName"`
		PageNo   int    `json:"pageNo"`
		PageSize int    `json:"pageSize"`
	}
	if err := bindOptionalJSON(c, &body); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	filter := service.AdminUserFilter{
		Account:  body.Account,
		RealName: body.RealName,
		Page:     body.PageNo,
		PageSize: body.PageSize,
	}

	rows, total, err := h.users.ListAdminUsers(c.Request.Context(), filter)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	// 转换成前端期望的 SystemUserRow 格式
	type userRow struct {
		UserID        string `json:"userId"`
		Account       string `json:"account"`
		RealName      string `json:"realName"`
		RoleID        string `json:"roleId"`
		RoleName      string `json:"roleName"`
		State         int    `json:"state"`
		LastLoginTime string `json:"lastLoginTime"`
		IsFACode      int    `json:"isFACode"`
	}

	list := make([]userRow, 0, len(rows))
	for _, r := range rows {
		fa := 0
		if r.TwoFAEnabled {
			fa = 1
		}
		list = append(list, userRow{
			UserID:        r.UID,
			Account:       r.Username,
			RealName:      r.RealName,
			RoleID:        r.RoleID,
			RoleName:      r.RoleName,
			State:         r.Status,
			LastLoginTime: r.UpdatedAt.Format("2006-01-02 15:04:05"),
			IsFACode:      fa,
		})
	}

	response.Success(c, gin.H{"list": list, "total": total})
}

// GetAdminUserDetail 获取管理员账号详情（编辑页回填）
func (h *Handler) GetAdminUserDetail(c *gin.Context) {
	uid := c.Param("userId")
	if uid == "" {
		uid = c.Query("userId")
	}
	if uid == "" {
		response.Error(c, consts.BadRequest, "缺少 userId 参数")
		return
	}

	detail, err := h.users.GetAdminUserDetail(c.Request.Context(), uid)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, detail)
}

// CreateOrUpdateAdminUser 新增或更新管理员账号（id 为空则新增）
func (h *Handler) CreateOrUpdateAdminUser(c *gin.Context) {
	var body struct {
		ID       string `json:"id"`
		Account  string `json:"account"`
		FullName string `json:"fullName"`
		RoleID   string `json:"roleId"`
		State    int    `json:"state"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	if body.ID == "" {
		if !h.ensureAnyPermission(c, "accountManage-add") {
			return
		}
		// 新增
		err := h.users.CreateAdminUser(c.Request.Context(), middleware.GetAdminUserID(c), service.AdminUserCreateInput{
			Account:  body.Account,
			FullName: body.FullName,
			RoleID:   body.RoleID,
			State:    body.State,
		})
		if err != nil {
			writeServiceError(c, err)
			return
		}
	} else {
		requiredPermission := "accountManage-edit"
		if body.Account == "" && body.FullName == "" && body.RoleID == "" && body.State != 0 {
			requiredPermission = "accountManage-disable"
		}
		if !h.ensureAnyPermission(c, requiredPermission) {
			return
		}
		// 更新
		err := h.users.UpdateAdminUser(c.Request.Context(), middleware.GetAdminUserID(c), service.AdminUserUpdateInput{
			ID:       body.ID,
			Account:  body.Account,
			FullName: body.FullName,
			RoleID:   body.RoleID,
			State:    body.State,
		})
		if err != nil {
			writeServiceError(c, err)
			return
		}
	}

	response.Success(c, gin.H{})
}

// ResetAdminUserPassword 重置管理员密码
func (h *Handler) ResetAdminUserPassword(c *gin.Context) {
	var body struct {
		UserID        string `json:"userId"         binding:"required"`
		Password      string `json:"password"       binding:"required"`
		Facode        string `json:"facode"         binding:"required"`
		FAChallengeID string `json:"fa_challenge_id" binding:"required"`
		IVID          string `json:"iv_id"          binding:"required"`
		Type          int    `json:"type"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(
		c,
		body.Facode,
		body.FAChallengeID,
		service.TwoFAActionAdminPasswordReset,
		"user:"+body.UserID,
	) {
		return
	}

	if err := h.users.ResetAdminUserPassword(
		c.Request.Context(),
		c.GetString("uid"),
		body.UserID,
		body.Password,
		body.IVID,
	); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// ResetAdminUser2FA 重置管理员 2FA
func (h *Handler) ResetAdminUser2FA(c *gin.Context) {
	var body struct {
		UserID        string `json:"userId" binding:"required"`
		Facode        string `json:"facode" binding:"required"`
		FAChallengeID string `json:"fa_challenge_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(
		c,
		body.Facode,
		body.FAChallengeID,
		service.TwoFAActionAdminTwoFAReset,
		"user:"+body.UserID,
	) {
		return
	}

	if err := h.users.ResetAdminUser2FA(c.Request.Context(), body.UserID); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}
