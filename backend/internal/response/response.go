package response

import (
	"auth-service/internal/consts"

	"github.com/gin-gonic/gin"
)

// 通用返回结构
type Response[T any] struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data T      `json:"data,omitempty"`
}

// 成功返回
func Success[T any](c *gin.Context, data T) {
	c.JSON(200, Response[T]{
		Code: int(consts.Success),
		Msg:  consts.BizCodeMsg[consts.Success],
		Data: data,
	})
}

// 失败返回
func Error(c *gin.Context, code consts.BizCode, msg ...string) {
	var message string
	if len(msg) > 0 {
		message = msg[0]
	} else {
		if v, ok := consts.BizCodeMsg[code]; ok {
			message = v
		} else {
			message = "未知错误"
		}
	}

	c.JSON(int(code), Response[any]{
		Code: int(code),
		Msg:  message,
		Data: nil,
	})
}
