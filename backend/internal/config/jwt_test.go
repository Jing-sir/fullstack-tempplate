package config

import (
	"testing"
	"time"
)

func TestJWTManagerGenerateAndParseToken(t *testing.T) {
	manager := NewJWTManager("test-secret", time.Hour)

	token, err := manager.GenerateToken("uid-1", "alice", 3)
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
	if claims.TokenVersion != 3 {
		t.Fatalf("claims.TokenVersion = %d, want %d", claims.TokenVersion, 3)
	}
}

func TestJWTManagerRejectsWrongSecret(t *testing.T) {
	manager := NewJWTManager("test-secret", time.Hour)
	token, err := manager.GenerateToken("uid-1", "alice", 1)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	otherManager := NewJWTManager("other-secret", time.Hour)
	if _, err := otherManager.ParseToken(token); err == nil {
		t.Fatal("ParseToken() error = nil, want error")
	}
}

func TestJWTManagerGenerateTwoFASetupToken(t *testing.T) {
	manager := NewJWTManager("test-secret", time.Hour)
	token, err := manager.GenerateTwoFASetupToken("uid-1", "alice", 1)
	if err != nil {
		t.Fatalf("GenerateTwoFASetupToken() error = %v", err)
	}

	claims, err := manager.ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}
	if claims.Purpose != TokenPurposeTwoFASetup {
		t.Fatalf("claims.Purpose = %q, want %q", claims.Purpose, TokenPurposeTwoFASetup)
	}
	if remaining := time.Until(claims.ExpiresAt.Time); remaining > twoFASetupTokenExpire || remaining < 9*time.Minute {
		t.Fatalf("setup token remaining lifetime = %s, want about %s", remaining, twoFASetupTokenExpire)
	}
}
