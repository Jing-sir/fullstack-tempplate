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
	"auth-service/internal/middleware"
	"auth-service/internal/repository"
	"auth-service/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Run 是应用入口，负责初始化所有依赖、装配服务、启动 HTTP 服务器，
// 并在收到 SIGINT/SIGTERM 信号时优雅退出
func Run(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// 初始化数据库连接池
	db, err := config.OpenDB(ctx, cfg.DatabaseDSN)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	// 初始化 Redis 客户端并验证连通性
	redisClient := config.NewRedisClient(cfg)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("connect redis: %w", err)
	}
	defer redisClient.Close()

	// 依赖装配（构造函数注入，无全局变量）
	jwtManager := config.NewJWTManager(cfg.JWTSecret, cfg.JWTExpirePeriod)
	ivRepo := repository.NewIVRepository(redisClient)
	ivService := service.NewIVService(ivRepo)
	userRepo := repository.NewAdminUserRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	opLogRepo := repository.NewOperationLogRepository(db)
	userService := service.NewUserService(userRepo, ivService, jwtManager, cfg.PasswordCryptoKey, cfg.AppName)
	permService := service.NewPermissionService(roleRepo, menuRepo)
	menuService := service.NewMenuService(menuRepo)
	roleService := service.NewRoleService(roleRepo, menuRepo)
	opLogService := service.NewOperationLogService(opLogRepo)

	// 确保种子用户存在（用于开发/测试环境）
	if err := userService.EnsureSeedUser(ctx, cfg.SeedUsername, cfg.SeedPassword); err != nil {
		return fmt.Errorf("seed user: %w", err)
	}

	router, err := newRouter(cfg, handler.New(userService, ivService, permService, menuService, roleService, opLogService, jwtManager), opLogRepo)
	if err != nil {
		return fmt.Errorf("init router: %w", err)
	}
	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// 监听操作系统信号，触发优雅退出
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
		// 收到退出信号，给正在处理的请求最多 5 秒完成
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

// newRouter 创建并配置 Gin 路由引擎，包括 CORS 策略和所有路由注册
func newRouter(cfg config.Config, h *handler.Handler, opLogRepo *repository.OperationLogRepository) (*gin.Engine, error) {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	// 不信任任何代理，避免 IP 伪造风险；如有反向代理需按实际情况配置
	if err := router.SetTrustedProxies(nil); err != nil {
		return nil, err
	}

	router.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{
			"Authorization", "Content-Type", "Accept", "Cache-Control",
			"Token",           // 前端 http.ts 兼容旧 Token 字段
			"X-B3-Traceid",    // 分布式链路追踪
			"X-B3-Spanid",     // 分布式链路追踪
			"DateTime",        // 前端时间戳头
			"language",        // 前端语言标识
			"Accept-Language", // 标准语言协商头
			"pretreatment",    // 前端响应预处理标志
			"deviceID",        // 前端设备标识
		},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	handler.RegisterRoutes(router, h, middleware.OperationLogMiddleware(opLogRepo))
	return router, nil
}
