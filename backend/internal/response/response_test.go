package response

import (
	"encoding/json"
	"testing"
)

func TestResponseKeepsEmptyDataArray(t *testing.T) {
	body, err := json.Marshal(Response[[]string]{
		Code: 200,
		Msg:  "ok",
		Data: []string{},
	})
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	if got, want := string(body), `{"code":200,"msg":"ok","data":[]}`; got != want {
		t.Fatalf("Marshal() = %s, want %s", got, want)
	}
}
