package handler

import (
	"fmt"
	"strconv"

	"auth-service/internal/consts"
	"auth-service/internal/middleware"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// ListMenus 返回当前登录用户有权限访问的菜单树，供前端侧栏使用
func (h *Handler) ListMenus(c *gin.Context) {
	uid := c.GetString("uid")
	user, err := h.users.GetUserByUID(c.Request.Context(), uid)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	tree, err := h.perms.GetMyMenus(c.Request.Context(), user)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, tree)
}

// ListPagePermissions 返回当前用户在指定菜单页下拥有的完整子权限树
func (h *Handler) ListPagePermissions(c *gin.Context) {
	var input struct {
		ParentKey string `json:"parentKey" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	tree, err := h.perms.GetMyPagePermissions(c.Request.Context(), middleware.GetAdminUserID(c), input.ParentKey)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, tree)
}

// ListAllMenus 返回完整菜单树（菜单管理页用，需鉴权）
func (h *Handler) ListAllMenus(c *gin.Context) {
	tree, err := h.menus.ListTree(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, tree)
}

// CreateMenu 新增菜单或按钮
func (h *Handler) CreateMenu(c *gin.Context) {
	var input service.CreateMenuInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(
		c,
		input.FACode,
		input.FAChallengeID,
		service.TwoFAActionMenuCreate,
		fmt.Sprintf("parent:%d:key:%s", input.ParentID, input.Name),
	) {
		return
	}

	id, err := h.menus.Create(c.Request.Context(), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"id": id})
}

// UpdateMenu 更新菜单基本信息
func (h *Handler) UpdateMenu(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的菜单 ID")
		return
	}

	var input service.UpdateMenuInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(c, input.FACode, input.FAChallengeID, service.TwoFAActionMenuUpdate, menuTarget(id)) {
		return
	}

	if err := h.menus.Update(c.Request.Context(), id, input); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// DeleteMenu 删除菜单或按钮
func (h *Handler) DeleteMenu(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的菜单 ID")
		return
	}

	var input struct {
		FACode        string `json:"facode" binding:"required"`
		FAChallengeID string `json:"fa_challenge_id" binding:"required"`
		Cascade       bool   `json:"cascade"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(c, input.FACode, input.FAChallengeID, service.TwoFAActionMenuDelete, menuTarget(id)) {
		return
	}

	if err := h.menus.Delete(c.Request.Context(), id, input.Cascade); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// UpdateMenuStatus 更新菜单状态
func (h *Handler) UpdateMenuStatus(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的菜单 ID")
		return
	}

	var input struct {
		Status        *int   `json:"status" binding:"required"`
		FACode        string `json:"facode" binding:"required"`
		FAChallengeID string `json:"fa_challenge_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(c, input.FACode, input.FAChallengeID, service.TwoFAActionMenuStatus, menuTarget(id)) {
		return
	}

	if err := h.menus.UpdateStatus(c.Request.Context(), id, *input.Status); err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, gin.H{})
}

// MoveMenu 移动菜单父级并更新排序
func (h *Handler) MoveMenu(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的菜单 ID")
		return
	}

	var input struct {
		ParentID      *int64 `json:"parent_id" binding:"required"`
		Sort          int    `json:"sort"`
		FACode        string `json:"facode" binding:"required"`
		FAChallengeID string `json:"fa_challenge_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}
	if !h.requireCurrentTwoFA(c, input.FACode, input.FAChallengeID, service.TwoFAActionMenuMove, menuTarget(id)) {
		return
	}

	if err := h.menus.Move(c.Request.Context(), id, service.MoveMenuInput{
		ParentID: *input.ParentID,
		Sort:     input.Sort,
	}); err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, gin.H{})
}

func (h *Handler) requireCurrentTwoFA(
	c *gin.Context,
	code string,
	challengeID string,
	action string,
	target string,
) bool {
	adminUserID := middleware.GetAdminUserID(c)
	if adminUserID == 0 {
		response.Error(c, consts.Unauthorized, "用户未登录")
		return false
	}
	if err := h.users.ValidateCurrentTwoFA(
		c.Request.Context(),
		adminUserID,
		code,
		challengeID,
		action,
		target,
	); err != nil {
		writeServiceError(c, err)
		return false
	}
	return true
}

func menuTarget(id int64) string {
	return "menu:" + strconv.FormatInt(id, 10)
}

// parseID 从路径参数 :id 解析 int64，解析失败时返回 error
func parseID(c *gin.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64)
}
