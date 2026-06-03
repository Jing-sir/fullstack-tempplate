package response

import (
	"auth-service/internal/consts"

	"github.com/gin-gonic/gin"
)

// Response 统一响应体结构，所有接口返回格式一致
type Response[T any] struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data T      `json:"data"`
}

// Success 返回业务成功响应，HTTP 状态码固定为 200
func Success[T any](c *gin.Context, data T) {
	c.JSON(200, Response[T]{
		Code: int(consts.Success),
		Msg:  consts.BizCodeMsg[consts.Success],
		Data: data,
	})
}

// Error 返回业务错误响应，HTTP 状态码与业务状态码保持一致。
// msg 为可选覆盖消息，不传时使用 BizCodeMsg 中的默认值。
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
