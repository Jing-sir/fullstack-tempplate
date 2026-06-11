package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
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

		// 先递归脱敏再截断，避免密码、token、TOTP 密钥或验证码进入数据库
		reqDataStr := truncate(sanitizeJSON(reqBody), 4096)
		respDataStr := truncate(sanitizeJSON(blw.body.Bytes()), 4096)

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

func sanitizeJSON(body []byte) string {
	if len(body) == 0 {
		return ""
	}

	var value any
	if err := json.Unmarshal(body, &value); err != nil {
		return "[非 JSON 请求体已省略]"
	}
	redactSensitiveFields(value)

	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return "[JSON 序列化失败]"
	}
	return strings.TrimSpace(buf.String())
}

func redactSensitiveFields(value any) {
	switch current := value.(type) {
	case map[string]any:
		for key, child := range current {
			if isSensitiveField(key, child) {
				current[key] = "[REDACTED]"
				continue
			}
			redactSensitiveFields(child)
		}
	case []any:
		for _, child := range current {
			redactSensitiveFields(child)
		}
	}
}

func isSensitiveField(key string, value any) bool {
	normalized := strings.ToLower(strings.ReplaceAll(key, "_", ""))
	if strings.Contains(normalized, "password") ||
		strings.Contains(normalized, "token") ||
		strings.Contains(normalized, "secret") ||
		normalized == "facode" ||
		normalized == "fachallengeid" ||
		normalized == "otpauthurl" {
		return true
	}
	// TOTP 校验接口常使用 code 字段；数字业务响应码保留，字符串验证码一律脱敏。
	return normalized == "code" && isString(value)
}

func isString(value any) bool {
	_, ok := value.(string)
	return ok
}
