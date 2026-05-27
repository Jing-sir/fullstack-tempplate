package config

import (
	"testing"
	"time"
)

func TestJWTManagerGenerateAndParseToken(t *testing.T) {
	manager := NewJWTManager("test-secret", time.Hour)

	token, err := manager.GenerateToken("uid-1", "alice")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := manager.ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}

	if claims.UID != "uid-1" {
		t.Fatalf("claims.UID = %q, want %q", claims.UID, "uid-1")
	}
	if claims.Username != "alice" {
		t.Fatalf("claims.Username = %q, want %q", claims.Username, "alice")
	}
}

func TestJWTManagerRejectsWrongSecret(t *testing.T) {
	manager := NewJWTManager("test-secret", time.Hour)
	token, err := manager.GenerateToken("uid-1", "alice")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	otherManager := NewJWTManager("other-secret", time.Hour)
	if _, err := otherManager.ParseToken(token); err == nil {
		t.Fatal("ParseToken() error = nil, want error")
	}
}
