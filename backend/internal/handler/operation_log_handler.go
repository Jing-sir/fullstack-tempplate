package handler

import (
	"auth-service/internal/consts"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// ListOperationLogs 分页查询操作日志
func (h *Handler) ListOperationLogs(c *gin.Context) {
	filter := service.OperationLogFilter{
		OpAccount: c.Query("opAccount"),
		ReqFunc:   c.Query("reqFunc"),
		StartTime: c.Query("startTime"),
		EndTime:   c.Query("endTime"),
		Page:      queryInt(c, "pageNo", 1),
		PageSize:  queryInt(c, "pageSize", 20),
	}

	logs, total, err := h.opLogs.ListPage(c.Request.Context(), filter)
	if err != nil {
		response.Error(c, consts.InternalServerError, "系统内部错误")
		return
	}

	response.Success(c, gin.H{"list": logs, "total": total})
}
