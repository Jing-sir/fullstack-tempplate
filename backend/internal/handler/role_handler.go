package handler

import (
	"fmt"
	"strconv"

	"auth-service/internal/consts"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// ListRoles 返回所有角色列表
func (h *Handler) ListRoles(c *gin.Context) {
	roles, err := h.roles.List(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"roles": roles})
}

// CreateRole 新增角色
func (h *Handler) CreateRole(c *gin.Context) {
	var input service.CreateRoleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	id, err := h.roles.Create(c.Request.Context(), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"id": id})
}

// UpdateRole 更新角色基本信息
func (h *Handler) UpdateRole(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的角色 ID")
		return
	}

	var input service.UpdateRoleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	if err := h.roles.Update(c.Request.Context(), id, input); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// DeleteRole 删除角色
func (h *Handler) DeleteRole(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的角色 ID")
		return
	}

	if err := h.roles.Delete(c.Request.Context(), id); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}

// GetRoleInfo 获取角色详情（供角色编辑页回填）
func (h *Handler) GetRoleInfo(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的角色 ID")
		return
	}

	role, err := h.roles.GetByID(c.Request.Context(), id)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{
		"roleId":   fmt.Sprintf("%d", role.ID),
		"roleName": role.Title,
		"remark":   role.Description,
		"state":    role.Status,
	})
}

// AddUpdateRole 新增或更新角色（同时设置菜单权限）
func (h *Handler) AddUpdateRole(c *gin.Context) {
	var body struct {
		RoleID     string `json:"roleId"`
		RoleName   string `json:"roleName" binding:"required"`
		Remark     string `json:"remark"`
		State      int    `json:"state"`
		MenuIDList []struct {
			MenuID            int64 `json:"menuId"`
			CheckUserPassword int   `json:"checkUserPassword"`
		} `json:"menuIdList"`
		CheckOpPassword bool `json:"checkOpPassword"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	menuIDs := make([]int64, 0, len(body.MenuIDList))
	for _, m := range body.MenuIDList {
		menuIDs = append(menuIDs, m.MenuID)
	}

	if body.RoleID == "" {
		if !h.ensureAnyPermission(c, "rolePermissions-add") {
			return
		}
		// 新增
		status := body.State
		if status == 0 {
			status = 1
		}
		_, err := h.roles.CreateWithMenus(c.Request.Context(), service.CreateRoleInput{
			Name:        body.RoleName,
			Title:       body.RoleName,
			Description: body.Remark,
			Status:      status,
		}, menuIDs)
		if err != nil {
			writeServiceError(c, err)
			return
		}
	} else {
		if !h.ensureAnyPermission(c, "rolePermissions-edit") {
			return
		}
		// 更新
		roleIDInt, err := strconv.ParseInt(body.RoleID, 10, 64)
		if err != nil {
			response.Error(c, consts.BadRequest, "无效的角色 ID")
			return
		}
		if err := h.roles.UpdateWithMenus(c.Request.Context(), roleIDInt, service.UpdateRoleInput{
			Name:        body.RoleName,
			Title:       body.RoleName,
			Description: body.Remark,
			Status:      body.State,
		}, menuIDs); err != nil {
			writeServiceError(c, err)
			return
		}
	}

	response.Success(c, gin.H{})
}
func (h *Handler) GetRoleMenus(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的角色 ID")
		return
	}

	menuIDs, err := h.roles.GetMenuIDs(c.Request.Context(), id)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{"menu_ids": menuIDs})
}

// SetRoleMenus 批量覆盖角色的菜单权限
func (h *Handler) SetRoleMenus(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, consts.BadRequest, "无效的角色 ID")
		return
	}

	var input struct {
		MenuIDs []int64 `json:"menu_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	if err := h.roles.SetMenus(c.Request.Context(), id, input.MenuIDs); err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, gin.H{})
}
