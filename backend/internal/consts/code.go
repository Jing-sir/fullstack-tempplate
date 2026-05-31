package consts

// BizCode 业务状态码，复用 HTTP 状态码语义，便于前端统一处理
type BizCode int

const (
	Success             BizCode = 200 // 请求成功
	BadRequest          BizCode = 400 // 参数错误或请求格式非法
	Unauthorized        BizCode = 401 // 未登录或认证失败
	Forbidden           BizCode = 403 // 已登录但权限不足
	NotFound            BizCode = 404 // 资源不存在
	Conflict            BizCode = 409 // 数据冲突（如重复注册、状态不允许等）
	InternalServerError BizCode = 500 // 系统内部错误，需运维介入
	ServiceUnavailable  BizCode = 503 // 服务不可用（依赖组件故障等）
)

// BizCodeMsg 各状态码对应的默认消息，handler 层可按需覆盖
var BizCodeMsg = map[BizCode]string{
	Success:             "请求成功",
	BadRequest:          "参数错误",
	Unauthorized:        "用户未登录或认证失败",
	Forbidden:           "权限不足",
	NotFound:            "资源不存在",
	Conflict:            "数据冲突",
	InternalServerError: "系统内部错误",
	ServiceUnavailable:  "服务不可用",
}
