package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"auth-service/internal/config"
	"auth-service/internal/handler"
	"auth-service/internal/repository"
	"auth-service/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	db, err := config.OpenDB(cfg.DatabaseDSN)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	redisClient := config.NewRedisClient(cfg)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("connect redis: %w", err)
	}
	defer redisClient.Close()

	jwtManager := config.NewJWTManager(cfg.JWTSecret, cfg.JWTExpirePeriod)
	ivRepo := repository.NewIVRepository(redisClient)
	ivService := service.NewIVService(ivRepo)
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo, ivService, jwtManager, cfg.PasswordCryptoKey, cfg.AppName)

	if err := userService.EnsureSeedUser(ctx, cfg.SeedUsername, cfg.SeedPassword); err != nil {
		return fmt.Errorf("seed user: %w", err)
	}

	router := newRouter(cfg, handler.New(userService, ivService, jwtManager))
	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return err
		}
		return <-errCh
	case err := <-errCh:
		return err
	}
}

func newRouter(cfg config.Config, h *handler.Handler) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	handler.RegisterRoutes(router, h)
	return router
}
