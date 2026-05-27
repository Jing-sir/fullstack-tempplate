package consts

// 业务状态码
type BizCode int

const (
	Success             BizCode = 200 // 业务成功
	BadRequest          BizCode = 400 // 参数错误
	Unauthorized        BizCode = 401 // 用户未登录或认证失败
	Forbidden           BizCode = 403 // 权限不足
	NotFound            BizCode = 404 // 资源不存在
	Conflict            BizCode = 409 // 数据冲突（重复、状态异常等）
	InternalServerError BizCode = 500 // 系统内部错误
	ServiceUnavailable  BizCode = 503 // 服务不可用
)

// 默认 msg 映射
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
