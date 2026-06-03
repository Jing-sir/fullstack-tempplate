package handler

import (
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

	if err := h.menus.Delete(c.Request.Context(), id); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// parseID 从路径参数 :id 解析 int64，解析失败时返回 error
func parseID(c *gin.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64)
}
