package model

import "time"

// OperationLog 对应 operation_logs 表，记录每次鉴权接口的操作信息
type OperationLog struct {
	ID          int64     `json:"id"`
	OpAccount   string    `json:"opAccount"`
	OpTime      time.Time `json:"opTime"`
	IP          string    `json:"ip"`
	ReqFunc     string    `json:"reqFunc"`
	ReqURL      string    `json:"reqUrl"`
	ReqData     string    `json:"reqData"`
	RespData    string    `json:"respData"`
	ReqMethod   string    `json:"reqMethod"`
	ElapsedTime int64     `json:"elapsedTime"`
	OccurErr    bool      `json:"occurErr"`
	ErrMsg      string    `json:"errMsg"`
	Success     bool      `json:"success"`
}
