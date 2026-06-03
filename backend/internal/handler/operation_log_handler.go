package handler

import (
	"auth-service/internal/consts"
	"auth-service/internal/response"
	"auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

// ListOperationLogs 分页查询操作日志
func (h *Handler) ListOperationLogs(c *gin.Context) {
	var body struct {
		OpAccount string `json:"opAccount"`
		ReqFunc   string `json:"reqFunc"`
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
		PageNo    int    `json:"pageNo"`
		PageSize  int    `json:"pageSize"`
	}
	if err := bindOptionalJSON(c, &body); err != nil {
		response.Error(c, consts.BadRequest, "参数错误")
		return
	}

	filter := service.OperationLogFilter{
		OpAccount: body.OpAccount,
		ReqFunc:   body.ReqFunc,
		StartTime: body.StartTime,
		EndTime:   body.EndTime,
		Page:      body.PageNo,
		PageSize:  body.PageSize,
	}

	logs, total, err := h.opLogs.ListPage(c.Request.Context(), filter)
	if err != nil {
		response.Error(c, consts.InternalServerError, "系统内部错误")
		return
	}

	response.Success(c, gin.H{"list": logs, "total": total})
}
