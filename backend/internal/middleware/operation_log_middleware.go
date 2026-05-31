package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"auth-service/internal/model"
	"auth-service/internal/repository"

	"github.com/gin-gonic/gin"
)

// responseBodyWriter 拦截响应体用于记录日志
type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// OperationLogMiddleware 记录所有鉴权接口的请求和响应信息
func OperationLogMiddleware(repo *repository.OperationLogRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 读取请求体（读完后恢复，避免后续 handler 拿不到 body）
		var reqBody []byte
		if c.Request.Body != nil {
			reqBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(reqBody))
		}

		// 拦截响应体
		blw := &responseBodyWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = blw

		c.Next()

		elapsed := time.Since(start).Milliseconds()
		statusCode := c.Writer.Status()
		success := statusCode >= http.StatusOK && statusCode < http.StatusBadRequest

		var errMsg string
		if len(c.Errors) > 0 {
			errMsg = c.Errors.String()
		}

		// 限制存储长度，避免超大报文撑爆数据库
		reqDataStr := truncate(string(reqBody), 4096)
		respDataStr := truncate(blw.body.String(), 4096)

		// 尝试压缩 JSON（去掉空白），存储更紧凑
		reqDataStr = compactJSON(reqDataStr)
		respDataStr = compactJSON(respDataStr)

		clientIP := c.ClientIP()

		log := model.OperationLog{
			OpAccount:   c.GetString("username"),
			OpTime:      start,
			IP:          clientIP,
			ReqFunc:     c.FullPath(),
			ReqURL:      c.Request.URL.RequestURI(),
			ReqData:     reqDataStr,
			RespData:    respDataStr,
			ReqMethod:   c.Request.Method,
			ElapsedTime: elapsed,
			OccurErr:    !success || errMsg != "",
			ErrMsg:      errMsg,
			Success:     success,
		}

		// 异步写入，不阻塞请求响应；用 context.Background() 避免请求结束后 context 被 cancel
		go func() {
			_ = repo.Create(context.Background(), log)
		}()
	}
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

func compactJSON(s string) string {
	var buf bytes.Buffer
	if err := json.Compact(&buf, []byte(s)); err != nil {
		return s
	}
	return buf.String()
}
