package config

import "testing"

func TestLoadUsesEnvironment(t *testing.T) {
	t.Setenv("APP_NAME", "Custom API")
	t.Setenv("HTTP_ADDR", ":9999")
	t.Setenv("CORS_ORIGINS", "http://a.test,http://b.test")
	t.Setenv("DATABASE_DSN", "postgres://user:pass@127.0.0.1:5432/auth_service?sslmode=disable")
	t.Setenv("REDIS_DB", "2")
	t.Setenv("JWT_EXPIRE", "2h")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.AppName != "Custom API" {
		t.Fatalf("AppName = %q, want %q", cfg.AppName, "Custom API")
	}
	if cfg.HTTPAddr != ":9999" {
		t.Fatalf("HTTPAddr = %q, want %q", cfg.HTTPAddr, ":9999")
	}
	if len(cfg.CORSOrigins) != 2 {
		t.Fatalf("len(CORSOrigins) = %d, want 2", len(cfg.CORSOrigins))
	}
	if cfg.RedisDB != 2 {
		t.Fatalf("RedisDB = %d, want 2", cfg.RedisDB)
	}
	if cfg.JWTExpirePeriod.String() != "2h0m0s" {
		t.Fatalf("JWTExpirePeriod = %s, want 2h0m0s", cfg.JWTExpirePeriod)
	}
}

func TestLoadRequiresSecretsInProduction(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("DATABASE_DSN", "postgres://user:pass@127.0.0.1:5432/auth_service?sslmode=disable")

	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want production secret error")
	}
}
