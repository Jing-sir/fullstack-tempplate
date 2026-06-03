package middleware

import (
	"strings"
	"testing"
)

func TestSanitizeJSONRedactsSensitiveFields(t *testing.T) {
	input := []byte(`{
		"password":"Aa123456",
		"nested":{"token":"jwt-value","secret":"otp-secret","code":"123456"},
		"code":200,
		"username":"alice"
	}`)

	got := sanitizeJSON(input)
	for _, leaked := range []string{"Aa123456", "jwt-value", "otp-secret", "123456"} {
		if strings.Contains(got, leaked) {
			t.Fatalf("sanitizeJSON() leaked %q: %s", leaked, got)
		}
	}
	for _, expected := range []string{`"password":"[REDACTED]"`, `"code":200`, `"username":"alice"`} {
		if !strings.Contains(got, expected) {
			t.Fatalf("sanitizeJSON() = %s, want %s", got, expected)
		}
	}
}

func TestSanitizeJSONOmitsNonJSONBody(t *testing.T) {
	got := sanitizeJSON([]byte("plain-password"))
	if got != "[非 JSON 请求体已省略]" {
		t.Fatalf("sanitizeJSON() = %q", got)
	}
}
